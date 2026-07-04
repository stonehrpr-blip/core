// AI provider adapter — OpenAI by default, Anthropic as fallback.
// Streaming responses via SSE (Server-Sent Events). Returns an async iterator
// of text deltas; the route handler pipes them to the client.
//
// Both providers chunk via the standard OpenAI-compatible SSE format
// ("data: {...}\n\n" lines). Anthropic's native API uses a different schema
// but we wrap it here to a unified shape.

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export interface ChatCompletionOpts {
  messages: ChatMessage[];
  // Model preference. Defaults pulled from env.
  model?: string;
  // Max tokens for the reply (cost cap).
  maxTokens?: number;
  // Temperature 0-1
  temperature?: number;
  // If true, response is streamed via async iterator. If false, full JSON.
  stream?: boolean;
}

export interface StreamedReply {
  deltas: AsyncIterable<string>;
  done: Promise<{ promptTokens: number; completionTokens: number; model: string }>;
}

const PROVIDER = process.env.AI_PROVIDER || 'openai'; // 'openai' | 'anthropic'

export async function streamChat(opts: ChatCompletionOpts): Promise<StreamedReply> {
  if (PROVIDER === 'anthropic') return streamAnthropic(opts);
  return streamOpenAI(opts);
}

// ─── OpenAI ────────────────────────────────────────────────────────────────

async function streamOpenAI(opts: ChatCompletionOpts): Promise<StreamedReply> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = opts.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'authorization': `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: opts.messages,
      max_tokens: opts.maxTokens ?? 320,
      temperature: opts.temperature ?? 0.7,
      stream: true,
      stream_options: { include_usage: true },
    }),
  });
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '');
    throw new Error('openai_request_failed:' + res.status + ':' + detail.slice(0, 200));
  }

  let donePromiseResolve!: (v: { promptTokens: number; completionTokens: number; model: string }) => void;
  const done = new Promise<{ promptTokens: number; completionTokens: number; model: string }>(r => { donePromiseResolve = r; });

  async function* deltas(): AsyncIterable<string> {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let usage = { promptTokens: 0, completionTokens: 0 };
    while (true) {
      const { done: rDone, value } = await reader.read();
      if (rDone) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          const parsed = JSON.parse(payload);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) yield delta as string;
          if (parsed.usage) {
            usage.promptTokens = parsed.usage.prompt_tokens;
            usage.completionTokens = parsed.usage.completion_tokens;
          }
        } catch { /* ignore malformed chunks */ }
      }
    }
    donePromiseResolve({ ...usage, model });
  }
  return { deltas: deltas(), done };
}

// ─── Anthropic ─────────────────────────────────────────────────────────────

async function streamAnthropic(opts: ChatCompletionOpts): Promise<StreamedReply> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = opts.model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  // Anthropic separates system from messages
  const system = opts.messages.find(m => m.role === 'system')?.content || '';
  const conv = opts.messages.filter(m => m.role !== 'system');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      system,
      messages: conv,
      max_tokens: opts.maxTokens ?? 320,
      temperature: opts.temperature ?? 0.7,
      stream: true,
    }),
  });
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '');
    throw new Error('anthropic_request_failed:' + res.status + ':' + detail.slice(0, 200));
  }

  let donePromiseResolve!: (v: { promptTokens: number; completionTokens: number; model: string }) => void;
  const done = new Promise<{ promptTokens: number; completionTokens: number; model: string }>(r => { donePromiseResolve = r; });

  async function* deltas(): AsyncIterable<string> {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let usage = { promptTokens: 0, completionTokens: 0 };
    while (true) {
      const { done: rDone, value } = await reader.read();
      if (rDone) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        try {
          const evt = JSON.parse(line.slice(5).trim());
          if (evt.type === 'content_block_delta' && evt.delta?.text) yield evt.delta.text as string;
          if (evt.type === 'message_delta' && evt.usage) {
            usage.completionTokens = evt.usage.output_tokens || 0;
          }
          if (evt.type === 'message_start' && evt.message?.usage) {
            usage.promptTokens = evt.message.usage.input_tokens || 0;
          }
        } catch { /* ignore */ }
      }
    }
    donePromiseResolve({ ...usage, model });
  }
  return { deltas: deltas(), done };
}
