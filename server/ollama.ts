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

/** Turn the paper's pages into one text with page markers, trimmed to fit the context window. */
export function paperAsText(rawPages: string[]): { text: string; truncated: boolean; pagesIncluded: number } {
  let text = '';
  let pagesIncluded = 0;
  for (let i = 0; i < rawPages.length; i++) {
    const chunk = `\n\n[Page ${i + 1}]\n${rawPages[i].replace(/\s+\n/g, '\n').trim()}`;
    if (text.length + chunk.length > MAX_PAPER_CHARS) {
      const room = MAX_PAPER_CHARS - text.length;
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
  timeoutMs = 0
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
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
    req.on('error', (e: any) => reject(new OllamaUnavailableError(`Cannot reach Ollama at ${OLLAMA_HOST}: ${e?.code || e?.message || e}`)));
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

/** Pick the model to use: the preferred one if installed, otherwise the best installed chat model. */
export async function resolveModel(): Promise<string> {
  const models = await installedModels();
  for (const want of PREFERRED_MODELS) {
    const hit = models.find((m) => sameModel(m, want));
    if (hit) return hit;
  }
  const chat = models.filter((m) => !/embed|bge|minilm|nomic|vision|llava/i.test(m));
  if (chat.length > 0) return chat[0];
  throw new OllamaModelMissingError(`No chat model installed in Ollama (wanted ${OLLAMA_MODEL})`);
}

/** Report whether Ollama is running and which model would be used. */
export async function ollamaStatus(): Promise<{ running: boolean; modelInstalled: boolean; model: string; models: string[] }> {
  try {
    const models = await installedModels();
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

/** Send a chat request to Ollama and return the full reply and the model that produced it. */
export async function ollamaChat(messages: OllamaMessage[], format?: object): Promise<{ text: string; model: string }> {
  const model = await resolveModel();
  let reply = '';
  let streamError = '';
  const r = await request(
    '/api/chat',
    {
      model,
      messages,
      stream: true,
      ...(format ? { format } : {}),
      options: { num_ctx: NUM_CTX, temperature: 0.2 },
    },
    (line) => {
      const chunk = JSON.parse(line);
      if (chunk.error) streamError = chunk.error;
      reply += chunk.message?.content || '';
    }
  );
  if (r.status === 404) throw new OllamaModelMissingError(`Model ${model} not found: ${r.text}`);
  if (r.status !== 200) throw new Error(`Ollama error ${r.status}: ${r.text}`);
  if (streamError) throw new Error(`Ollama error: ${streamError}`);
  return { text: reply, model };
}
