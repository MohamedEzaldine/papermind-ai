/**
 * Local AI provider: runs the analysis on an Ollama model on the user's own machine,
 * with no API key and no cloud service.
 *
 * Unlike Gemini, Ollama models cannot read a PDF directly, so the server sends the
 * extracted text of the paper with explicit [Page N] markers. That way the model
 * can still cite page numbers.
 */

export const OLLAMA_HOST = (process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/$/, '');
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b';
/** Context window requested from Ollama. Papers need far more than Ollama's small default. */
const NUM_CTX = Number(process.env.OLLAMA_NUM_CTX || 32768);
/** Upper bound on paper text sent to the model (about 4 characters per token). */
const MAX_PAPER_CHARS = Number(process.env.OLLAMA_MAX_CHARS || Math.floor(NUM_CTX * 4 * 0.6));

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

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

export class OllamaUnavailableError extends Error {}

/** Check that Ollama is running and the configured model is installed. */
export async function ollamaStatus(): Promise<{ running: boolean; modelInstalled: boolean; models: string[] }> {
  try {
    const r = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) return { running: false, modelInstalled: false, models: [] };
    const data: any = await r.json();
    const models: string[] = (data.models || []).map((m: any) => m.name);
    const wanted = OLLAMA_MODEL.includes(':') ? OLLAMA_MODEL : `${OLLAMA_MODEL}:latest`;
    return { running: true, modelInstalled: models.includes(wanted) || models.includes(OLLAMA_MODEL), models };
  } catch {
    return { running: false, modelInstalled: false, models: [] };
  }
}

/**
 * Send a chat request to Ollama and return the full reply.
 * Streaming is used so slow local generation never hits an HTTP header timeout.
 */
export async function ollamaChat(messages: OllamaMessage[], format?: object): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: true,
        ...(format ? { format } : {}),
        options: { num_ctx: NUM_CTX, temperature: 0.2 },
      }),
    });
  } catch (e: any) {
    throw new OllamaUnavailableError(`Cannot reach Ollama at ${OLLAMA_HOST}: ${e?.message || e}`);
  }
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => '');
    throw new Error(`Ollama error ${res.status}: ${body}`);
  }

  let reply = '';
  let buffer = '';
  const decoder = new TextDecoder();
  const reader = res.body.getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      const chunk = JSON.parse(line);
      if (chunk.error) throw new Error(`Ollama error: ${chunk.error}`);
      reply += chunk.message?.content || '';
    }
  }
  if (buffer.trim()) {
    const chunk = JSON.parse(buffer);
    if (chunk.error) throw new Error(`Ollama error: ${chunk.error}`);
    reply += chunk.message?.content || '';
  }
  return reply;
}
