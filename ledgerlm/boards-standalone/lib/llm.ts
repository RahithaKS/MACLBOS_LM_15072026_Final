// Server-side LLM client. Prefers the Azure OpenAI deployment when configured;
// falls back to the LedgerLM Ollama server if Azure is unavailable.

export class ConfigError extends Error {}

interface GenerateOptions {
  /** Ask the provider to return a JSON object (Azure response_format). */
  json?: boolean;
  /**
   * Caller's abort signal. When the user stops an analysis the upstream
   * request is cancelled too, so a stopped run does not keep spending tokens.
   */
  signal?: AbortSignal;
}

/** The provider timeout, joined with the caller's abort signal when there is one. */
function requestSignal(opts: GenerateOptions): AbortSignal {
  const timeout = AbortSignal.timeout(240_000);
  if (!opts.signal) return timeout;
  if (typeof AbortSignal.any === "function") return AbortSignal.any([opts.signal, timeout]);
  return opts.signal;
}

function azureConfigured(): boolean {
  return Boolean(process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY);
}

function ollamaConfigured(): boolean {
  return Boolean(process.env.OLLAMA_BASE_URL && process.env.OLLAMA_API_KEY);
}

async function generateAzure(prompt: string, opts: GenerateOptions): Promise<string> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT!.replace(/\/$/, "");
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-5.2";
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? "2024-12-01-preview";
  const res = await fetch(
    `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.AZURE_OPENAI_API_KEY!,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: requestSignal(opts),
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Azure OpenAI returned HTTP ${res.status}: ${detail.slice(0, 300)}`);
  }
  const payload = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("Azure OpenAI reply had no message content.");
  }
  return content;
}

/**
 * Cloudflare fronts the model server and cuts the connection when the origin
 * takes longer than ~120s to answer (524), or when the origin is unreachable
 * (522). It replies with a full HTML error page, which is useless in the UI —
 * translate the status into something a board owner can act on.
 */
function describeGatewayFailure(status: number, detail: string): string {
  const isHtml = /^\s*<(?:!doctype|html)/i.test(detail);
  if (status === 524 || status === 504) {
    return "The model server took longer than its 120-second gateway limit to answer. Narrow the analysis scope (fewer key data columns, a coarser time granularity, or a shorter report template) and run it again.";
  }
  if (status === 522 || status === 523) {
    return "The model server at ollama.ledgerlm.ai is not reachable right now (the gateway could not connect to it). Check that the model host is running, then retry.";
  }
  if (status === 502 || status === 503) {
    return "The model server is temporarily unavailable. Retry in a moment.";
  }
  return `Model server returned HTTP ${status}${isHtml ? "." : `: ${detail.slice(0, 200)}`}`;
}

/** Failure that is worth retrying with a smaller request rather than as-is. */
export class ModelTimeoutError extends Error {}

async function generateOllama(prompt: string, opts: GenerateOptions = {}): Promise<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL!;
  // One retry on 5xx — the server sits behind Cloudflare, which surfaces
  // transient origin timeouts as 502/522/524.
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.OLLAMA_API_KEY!,
      },
      body: JSON.stringify({ prompt }),
      signal: requestSignal(opts),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      // A 524 means the generation itself ran long; repeating the identical
      // request just burns another two minutes, so surface it immediately.
      if (res.status >= 500 && res.status !== 524 && attempt === 0) {
        console.warn(`[llm] Ollama HTTP ${res.status}; retrying once`);
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      const message = describeGatewayFailure(res.status, detail);
      console.warn(`[llm] Ollama HTTP ${res.status} — ${message}`);
      throw res.status === 524 || res.status === 504
        ? new ModelTimeoutError(message)
        : new Error(message);
    }
    const payload = (await res.json()) as { response?: string };
    if (typeof payload.response !== "string") {
      throw new Error("Model server reply had no `response` field.");
    }
    return payload.response;
  }
}

export async function generate(prompt: string, opts: GenerateOptions = {}): Promise<string> {
  if (azureConfigured()) {
    try {
      return await generateAzure(prompt, opts);
    } catch (error) {
      // The Azure deployment may not exist yet — fall back to Ollama so the
      // app keeps working, and log the reason for the operator.
      if (ollamaConfigured()) {
        console.warn(
          `[llm] Azure OpenAI failed (${error instanceof Error ? error.message : error}); falling back to Ollama`,
        );
        return generateOllama(prompt, opts);
      }
      throw error;
    }
  }
  if (ollamaConfigured()) {
    return generateOllama(prompt, opts);
  }
  throw new ConfigError(
    "No model provider configured. Set AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_API_KEY (or OLLAMA_BASE_URL / OLLAMA_API_KEY) in .env.local and restart the dev server.",
  );
}
