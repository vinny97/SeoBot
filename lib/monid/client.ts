const DEFAULT_BASE_URL = "https://api.monid.ai";
const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "BLOCKED", "STOPPED", "TIMED_OUT"]);

export type MonidEndpointInput = {
  pathParams?: Record<string, unknown>;
  queryParams?: Record<string, unknown>;
  body?: unknown;
};

export type MonidInspection = {
  id: string;
  provider: string;
  providerName?: string;
  endpoint: string;
  method?: string;
  description: string;
  summary?: string;
  input?: {
    pathParams?: Record<string, unknown>;
    queryParams?: Record<string, unknown>;
    body?: Record<string, unknown>;
    bodyType?: string;
  };
  price?: Record<string, unknown>;
  docUrl?: string;
  notes?: string[];
  tags?: string[];
};

export type MonidRun = {
  runId: string;
  provider: string;
  endpoint: string;
  status: string;
  output?: unknown;
  providerResponse?: { httpStatus?: number; error?: unknown };
  price?: Record<string, unknown>;
  billing?: Record<string, unknown>;
  billedUnits?: number;
  reason?: string;
};

export class MonidApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly requestId: string | null,
  ) {
    super(message);
    this.name = "MonidApiError";
  }
}

export class MonidClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = DEFAULT_BASE_URL,
  ) {
    if (!apiKey.trim()) throw new Error("MONID_API_KEY is required.");
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<{ data: T; status: number }> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      signal: init.signal || AbortSignal.timeout(60_000),
    });
    const requestId = response.headers.get("x-request-id");
    const payload = await response.json().catch(() => null) as T | { message?: string } | null;
    if (!response.ok) {
      const message = payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
        ? payload.message
        : `Monid request failed with HTTP ${response.status}.`;
      throw new MonidApiError(message, response.status, requestId);
    }
    return { data: payload as T, status: response.status };
  }

  async inspect(provider: string, endpoint: string): Promise<MonidInspection> {
    return (await this.request<MonidInspection>("/v1/inspect", {
      method: "POST",
      body: JSON.stringify({ provider, endpoint }),
    })).data;
  }

  async run(provider: string, endpoint: string, input: MonidEndpointInput = {}): Promise<MonidRun> {
    const started = await this.request<MonidRun>("/v1/run", {
      method: "POST",
      body: JSON.stringify({ provider, endpoint, input }),
    });
    if (started.status !== 202 || TERMINAL_STATUSES.has(started.data.status)) return started.data;
    return this.waitForRun(started.data.runId);
  }

  async waitForRun(runId: string, timeoutMs = 120_000): Promise<MonidRun> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      const result = (await this.request<MonidRun>(`/v1/runs/${encodeURIComponent(runId)}`, { method: "GET" })).data;
      if (TERMINAL_STATUSES.has(result.status)) return result;
    }
    throw new Error(`Monid run ${runId} did not finish within ${timeoutMs}ms.`);
  }
}

export function createMonidClient(env: NodeJS.ProcessEnv = process.env) {
  return new MonidClient(env.MONID_API_KEY || "", env.MONID_API_BASE_URL || DEFAULT_BASE_URL);
}
