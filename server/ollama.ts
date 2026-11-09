/**
 * Local AI provider: runs the analysis on an Ollama model on the user's own machine,
 * with no API key and no cloud service.
 *
 * Unlike Gemini, Ollama models cannot read a PDF directly, so the server sends the
 * extracted text of the paper with explicit [Page N] markers. That way the model
 * can still cite page numbers.
 */
import http from 'node:http';
import https from 'node:https';

export const OLLAMA_HOST = (process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/$/, '');
/** Preferred model. If it is not installed, another installed chat model is used instead. */
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b';
/** Context window requested from Ollama. Larger is slower on computers without a GPU. */
const NUM_CTX = Number(process.env.OLLAMA_NUM_CTX || 16384);
/** Upper bound on paper text sent to the model (about 4 characters per token, leaving room for the answer). */
const MAX_PAPER_CHARS = Number(process.env.OLLAMA_MAX_CHARS || Math.floor(NUM_CTX * 4 * 0.55));

/** Fallback order when the preferred model is missing (good multilingual / Arabic models first). */
const PREFERRED_MODELS = [OLLAMA_MODEL, 'qwen2.5:7b', 'qwen2.5:14b', 'qwen2.5:3b', 'qwen3:8b', 'qwen3:4b', 'llama3.1:8b', 'gemma2:9b', 'mistral:7b'];

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Ollama is not running or not reachable. */
export class OllamaUnavailableError extends Error {}
/** Ollama is running but has no usable chat model installed. */
export class OllamaModelMissingError extends Error {}
/** The model stopped producing useful output (e.g. stuck repeating whitespace) and was stopped. */
export class OllamaStalledError extends Error {}

/**
 * Cut the reference list (it is often a quarter of a paper and adds nothing to the analysis,
 * but costs a lot of reading time on computers without a graphics card).
 */
export function withoutReferences(rawPages: string[]): string[] {
  const heading = /(?:^|\n)\s*(?:\d+\.?\s*)?(references|bibliography|literature cited|works cited|المراجع|قائمة المراجع)\s*(?:\n|$)/gi;
  for (let i = rawPages.length - 1; i >= 1; i--) {
    const matches = [...rawPages[i].matchAll(heading)];
    if (matches.length > 0) {
      const cut = matches[matches.length - 1].index!;
      return [...rawPages.slice(0, i), rawPages[i].slice(0, cut)];
    }
  }
  return rawPages;
}

/** Turn the paper's pages into one text with page markers, trimmed to fit the context window. */
export function paperAsText(rawPages: string[], maxChars = MAX_PAPER_CHARS): { text: string; truncated: boolean; pagesIncluded: number } {
  const MAX_PAPER_CHARS_ = maxChars;
  let text = '';
  let pagesIncluded = 0;
  for (let i = 0; i < rawPages.length; i++) {
    const chunk = `\n\n[Page ${i + 1}]\n${rawPages[i].replace(/[ \t]+/g, ' ').replace(/\s+\n/g, '\n').trim()}`;
    if (text.length + chunk.length > MAX_PAPER_CHARS_) {
      const room = MAX_PAPER_CHARS_ - text.length;
      if (room > 500) {
        text += chunk.slice(0, room);
        pagesIncluded++;
      }
      return { text, truncated: true, pagesIncluded };
    }
    text += chunk;
    pagesIncluded++;
  }
  return { text, truncated: false, pagesIncluded };
}

/** Convert a Gemini-style schema (Type.OBJECT, ...) to standard JSON Schema for Ollama's `format`. */
export function toJsonSchema(schema: any): any {
  if (Array.isArray(schema)) return schema.map(toJsonSchema);
  if (!schema || typeof schema !== 'object') return schema;
  const out: any = {};
  for (const [k, v] of Object.entries(schema)) {
    if (k === 'type' && typeof v === 'string') out.type = v.toLowerCase();
    else if (k === 'properties') {
      out.properties = Object.fromEntries(Object.entries(v as object).map(([pk, pv]) => [pk, toJsonSchema(pv)]));
    } else if (k === 'items') out.items = toJsonSchema(v);
    else out[k] = v;
  }
  return out;
}

/**
 * Minimal HTTP client for Ollama built on node:http.
 * Unlike fetch, it has no header or body timeouts: on a computer without a GPU the model
 * can need many minutes to read a whole paper before it sends its first byte.
 */
function request(
  path: string,
  body: object | null,
  onLine?: (line: string) => void,
  timeoutMs = 0,
  signal?: AbortSignal
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    let aborted = false;
    const url = new URL(OLLAMA_HOST + path);
    const lib = url.protocol === 'https:' ? https : http;
    const payload = body ? JSON.stringify(body) : undefined;
    const req = lib.request(
      url,
      {
        method: body ? 'POST' : 'GET',
        headers: payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {},
      },
      (res) => {
        res.setEncoding('utf8');
        let text = '';
        let buffer = '';
        res.on('data', (chunk: string) => {
          if (onLine && res.statusCode === 200) {
            buffer += chunk;
            let nl: number;
            while ((nl = buffer.indexOf('\n')) >= 0) {
              const line = buffer.slice(0, nl).trim();
              buffer = buffer.slice(nl + 1);
              if (line) onLine(line);
            }
          } else {
            text += chunk;
          }
        });
        res.on('end', () => {
          if (onLine && buffer.trim() && res.statusCode === 200) onLine(buffer.trim());
          resolve({ status: res.statusCode || 0, text });
        });
        res.on('error', reject);
      }
    );
    if (timeoutMs > 0) {
      req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')));
    }
    if (signal) {
      const onAbort = () => {
        aborted = true;
        req.destroy();
        reject(signal.reason instanceof Error ? signal.reason : new OllamaStalledError('aborted'));
      };
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }
    req.on('error', (e: any) => {
      if (aborted) return;
      reject(new OllamaUnavailableError(`Cannot reach Ollama at ${OLLAMA_HOST}: ${e?.code || e?.message || e}`));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

/** List installed models, or throw OllamaUnavailableError if Ollama is not running. */
async function installedModels(): Promise<string[]> {
  const r = await request('/api/tags', null, undefined, 4000);
  if (r.status !== 200) throw new OllamaUnavailableError(`Ollama responded with ${r.status}`);
  const data = JSON.parse(r.text || '{}');
  return (data.models || []).map((m: any) => String(m.name));
}

const sameModel = (a: string, b: string) =>
  a === b || a === `${b}:latest` || `${a}:latest` === b;

/** Models preferred for this computer (set at startup from the detected hardware). */
let hardwarePreference: string[] = [];
export function setPreferredModels(models: string[]) {
  hardwarePreference = models;
}

/** Pick the model to use: the requested one if installed, else the best match for this computer, else any installed chat model. */
export async function resolveModel(requested?: string): Promise<string> {
  const models = await installedModels();
  const order = [...(requested ? [requested] : []), ...(process.env.OLLAMA_MODEL ? [OLLAMA_MODEL] : []), ...hardwarePreference, ...PREFERRED_MODELS];
  for (const want of order) {
    const hit = models.find((m) => sameModel(m, want));
    if (hit) return hit;
  }
  const chat = chatModels(models);
  if (chat.length > 0) return chat[0];
  throw new OllamaModelMissingError(`No chat model installed in Ollama (wanted ${OLLAMA_MODEL})`);
}

const chatModels = (models: string[]) => models.filter((m) => !/embed|bge|minilm|nomic|vision|llava/i.test(m));

/** Is this model installed in Ollama? */
export async function isInstalled(model: string): Promise<boolean> {
  const models = await installedModels();
  return models.some((m) => sameModel(m, model));
}

/**
 * Download a model through Ollama, reporting progress (0-100) of the main model file.
 * Resolves when Ollama confirms success.
 */
export async function ollamaPull(model: string, onProgress: (percent: number, doneMB: number, totalMB: number) => void): Promise<void> {
  let ok = false;
  let error = '';
  const r = await request('/api/pull', { name: model, stream: true }, (line) => {
    const msg = JSON.parse(line);
    if (msg.error) error = msg.error;
    if (msg.total && msg.completed && msg.total > 50 * 1024 * 1024) {
      onProgress(Math.floor((msg.completed / msg.total) * 100), Math.round(msg.completed / 1048576), Math.round(msg.total / 1048576));
    }
    if (msg.status === 'success') ok = true;
  });
  if (r.status !== 200) throw new Error(`Ollama error ${r.status}: ${r.text}`);
  if (error) throw new Error(error);
  if (!ok) throw new Error('Download ended without confirmation');
}

/** Report whether Ollama is running, which model would be used, and which chat models exist. */
export async function ollamaStatus(): Promise<{ running: boolean; modelInstalled: boolean; model: string; models: string[] }> {
  try {
    const models = chatModels(await installedModels());
    try {
      const model = await resolveModel();
      return { running: true, modelInstalled: true, model, models };
    } catch {
      return { running: true, modelInstalled: false, model: OLLAMA_MODEL, models };
    }
  } catch {
    return { running: false, modelInstalled: false, model: OLLAMA_MODEL, models: [] };
  }
}

/** How long Ollama keeps the model in memory between requests (avoids reloading it for every paper). */
const KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE || '30m';

/** Load the model into memory ahead of time so the first analysis does not wait for it. */
export async function ollamaWarmup(requested?: string): Promise<void> {
  try {
    const model = await resolveModel(requested);
    await request('/api/generate', { model, keep_alive: KEEP_ALIVE });
  } catch {
    // Warm-up is best effort.
  }
}

/** Context window just large enough for this prompt plus the answer: smaller is faster and uses less RAM. */
export function contextFor(promptChars: number, answerTokens = 3500): number {
  const needed = Math.ceil(promptChars / 3.2) + answerTokens;
  return Math.min(NUM_CTX, Math.max(4096, Math.ceil(needed / 1024) * 1024));
}

export interface OllamaStats {
  promptTokens?: number;
  outputTokens?: number;
  /** Generation speed in tokens per second. */
  tokensPerSecond?: number;
  /** Seconds spent reading the prompt before the first token. */
  readSeconds?: number;
  totalSeconds?: number;
}

/**
 * Send a chat request to Ollama and return the full reply, the model used and speed stats.
 *
 * Safeguards against a model getting stuck (small models sometimes emit endless whitespace
 * or repeat themselves under a JSON format):
 *  - numPredict caps the answer length,
 *  - stallSeconds stops the request when no meaningful text arrives for that long after
 *    the first token, or when the answer ends in a long run of whitespace.
 */
export async function ollamaChat(
  messages: OllamaMessage[],
  format?: object | 'json',
  opts: {
    model?: string;
    numCtx?: number;
    numPredict?: number;
    stallSeconds?: number;
    onProgress?: (textSoFar: string) => void;
    onFirstToken?: () => void;
  } = {}
): Promise<{ text: string; model: string; stats: OllamaStats }> {
  const model = await resolveModel(opts.model);
  const started = Date.now();
  let reply = '';
  let streamError = '';
  let firstTokenAt = 0;
  let lastMeaningful = 0;
  const stats: OllamaStats = {};
  const controller = new AbortController();
  const watchdog = opts.stallSeconds
    ? setInterval(() => {
        if (!firstTokenAt) return;
        const idle = (Date.now() - lastMeaningful) / 1000;
        if (idle > opts.stallSeconds! || /\s{200,}$/.test(reply)) {
          controller.abort(new OllamaStalledError(`Model stopped producing useful output after ${Math.round((Date.now() - started) / 1000)}s`));
        }
      }, 2000)
    : undefined;
  try {
    const r = await request(
      '/api/chat',
      {
        model,
        messages,
        stream: true,
        keep_alive: KEEP_ALIVE,
        ...(format ? { format } : {}),
        options: {
          num_ctx: opts.numCtx || NUM_CTX,
          temperature: 0.2,
          repeat_penalty: 1.1,
          ...(opts.numPredict ? { num_predict: opts.numPredict } : {}),
        },
      },
      (line) => {
        const chunk = JSON.parse(line);
        if (chunk.error) streamError = chunk.error;
        const piece = chunk.message?.content || '';
        if (piece) {
          const now = Date.now();
          if (!firstTokenAt) {
            firstTokenAt = now;
            lastMeaningful = now;
            opts.onFirstToken?.();
          }
          if (/\S/.test(piece)) lastMeaningful = now;
          reply += piece;
          opts.onProgress?.(reply);
        }
        if (chunk.done) {
          stats.promptTokens = chunk.prompt_eval_count;
          stats.outputTokens = chunk.eval_count;
          if (chunk.eval_count && chunk.eval_duration) {
            stats.tokensPerSecond = +(chunk.eval_count / (chunk.eval_duration / 1e9)).toFixed(2);
          }
          if (chunk.prompt_eval_duration) stats.readSeconds = Math.round(chunk.prompt_eval_duration / 1e9);
        }
      },
      0,
      controller.signal
    );
    stats.totalSeconds = Math.round((Date.now() - started) / 1000);
    if (r.status === 404) throw new OllamaModelMissingError(`Model ${model} not found: ${r.text}`);
    if (r.status !== 200) throw new Error(`Ollama error ${r.status}: ${r.text}`);
    if (streamError) throw new Error(`Ollama error: ${streamError}`);
    console.log(`Ollama ${model}: ${JSON.stringify(stats)}`);
    return { text: reply, model, stats };
  } finally {
    clearInterval(watchdog);
  }
}
