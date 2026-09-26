import { ApiError } from "@/shared/api/error-handler";
import { AUTH_TOKEN_COOKIE_NAME } from "@/shared/constants";
import { getCookie } from "@/shared/utils/cookie";

const API_BASE_URL = `${(import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "").replace(/\/api\/v1$/, "")}/api/v1`;
const SUCCESS_STATUS_CODE = "00000";

export interface ApiEnvelope {
  status_code: string;
  message: string;
  response_datetime: string;
}

interface ApiErrorBody {
  status_code?: string;
  message?: string;
  detail?: string;
}

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown; responseType?: "json" | "blob" };
type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export class HttpError extends ApiError {
  constructor(
    message: string,
    public readonly status: number,
    statusCode?: string
  ) {
    super(message, statusCode);
    this.name = "HttpError";
  }
}

export const setUnauthorizedHandler = (handler: UnauthorizedHandler): void => {
  unauthorizedHandler = handler;
};

const isApiEnvelope = (payload: unknown): payload is ApiEnvelope =>
  typeof payload === "object"
  && payload !== null
  && "status_code" in payload
  && "message" in payload;

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const token = getCookie(AUTH_TOKEN_COOKIE_NAME);
  const { body, responseType = "json", ...init } = options;
  const isFormData = body instanceof FormData;
  const headers = new Headers(init.headers);

  headers.set("Accept", "application/json");
  if (body !== undefined && !isFormData) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined
  });

  if (response.status === 401 && token) unauthorizedHandler?.();
  if (response.status === 204) {
    if (!response.ok) throw new HttpError(`Request failed (${response.status})`, response.status);
    return undefined as T;
  }

  // 錯誤時後端仍回 JSON，所以只有成功時才讀成 blob
  if (response.ok && responseType === "blob") return await response.blob() as T;

  const payload = await response.json().catch(() => undefined) as T | ApiErrorBody | undefined;

  if (!response.ok) {
    const error = payload as ApiErrorBody | undefined;
    throw new HttpError(
      error?.message ?? error?.detail ?? `Request failed (${response.status})`,
      response.status,
      error?.status_code
    );
  }

  if (isApiEnvelope(payload) && payload.status_code !== SUCCESS_STATUS_CODE) {
    throw new ApiError(payload.message ?? "Request failed", payload.status_code);
  }
  return payload as T;
};

export const httpClient = {
  get: <T>(path: string): Promise<T> => request<T>(path, { method: "GET" }),
  getBlob: (path: string): Promise<Blob> => request<Blob>(path, { method: "GET", responseType: "blob" }),
  post: <T>(path: string, body?: unknown): Promise<T> => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body: unknown): Promise<T> => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body: unknown): Promise<T> => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string): Promise<T> => request<T>(path, { method: "DELETE" })
};
