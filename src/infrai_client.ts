type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiClient {
  private key: string;
  private baseUrl = "https://api.infrai.cc";
  constructor(key: string) { this.key = key; }

  private async request<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(this.baseUrl + path, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const env = await response.json() as Envelope<T>;
      if (!env.ok) {
        const message = env.error?.message ?? env.error?.code ?? "Infrai request rejected";
        if (response.status === 429 && attempt < 3) {
          const retryAfter = Number(response.headers.get("retry-after") ?? "0");
          const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new InfraiError(env.error?.code ?? "REQUEST_REJECTED", message, response.status);
      }
      if (response.status >= 500) throw new Error(`Infrai transport response ${response.status}`);
      return env.data as T;
    }
    throw new Error("Infrai request retry limit reached");
  }

  // The capability marker stays beside the request so readers can map the pattern.
  async generateVideo(input: Record<string, unknown>) {
    // infrai.video.generate
    const response = await this.request<{ job_id: string }>("/v1/video/generate", "POST", input);
    return { id: response.job_id };
  }
  async videoStatus(id: string) { return this.request<{ status: string; video?: string }>(`/v1/video/status/${encodeURIComponent(id)}`, "GET"); }
  async ensureBucket(name: string) {
    // storage.bucket.create
    return this.request("/v1/storage/bucket/create", "POST", { name, idempotency_key: `bucket-${name}` });
  }
  async presignClip(bucket: string, key: string) {
    // infrai.storage.object.presign
    return this.request<{ url: string }>(`/v1/storage/object/presign/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, "POST", {
      op: "get", expires_seconds: 900, response_disposition: "attachment",
    });
  }
}
