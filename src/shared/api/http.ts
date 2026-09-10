const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"}/api/v1`;
const AUTH_STORAGE_KEY = "sroi.auth.user";

interface StoredAuth {
  token?: string;
}

interface ApiErrorBody {
  message?: string;
  detail?: string;
}

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "HttpError";
  }
}

const getToken = (): string | null => {
  const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) return null;

  try {
    return (JSON.parse(stored) as StoredAuth).token ?? null;
  } catch {
    return null;
  }
};

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");

  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    let body: ApiErrorBody = {};
    try {
      body = await response.json() as ApiErrorBody;
    } catch {
      // The server may return an empty or non-JSON error response.
    }
    throw new HttpError(body.message ?? body.detail ?? `Request failed (${response.status})`, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

export const httpClient = {
  get: <T>(path: string): Promise<T> => request<T>(path),
  post: <T>(path: string, body: unknown): Promise<T> => request<T>(path, {
    method: "POST",
    body: JSON.stringify(body)
  }),
  put: <T>(path: string, body: unknown): Promise<T> => request<T>(path, {
    method: "PUT",
    body: JSON.stringify(body)
  }),
  patch: <T>(path: string, body: unknown): Promise<T> => request<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body)
  }),
  delete: (path: string): Promise<void> => request<void>(path, { method: "DELETE" })
};
