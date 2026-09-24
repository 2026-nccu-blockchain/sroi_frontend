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
  message?: string;
  detail?: string;
  status_code?: string;
}

export class HttpError extends ApiError {
  constructor(message: string, public readonly status: number, statusCode?: string) {
    super(message, statusCode);
    this.name = "HttpError";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };
let unauthorizedHandler: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: () => void): void => {
  unauthorizedHandler = handler;
};

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const token = getCookie(AUTH_TOKEN_COOKIE_NAME);
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });
  const payload: unknown = await response.json().catch(() => undefined);
  const envelope = payload && typeof payload === "object" ? payload as ApiErrorBody : undefined;

  if (response.status === 401 && token) unauthorizedHandler?.();
  if (!response.ok) {
    throw new HttpError(envelope?.message ?? envelope?.detail ?? `Request failed (${response.status})`, response.status, envelope?.status_code);
  }
  // Auth endpoints return envelopes; form endpoints return plain objects or arrays.
  if (envelope?.status_code !== undefined && envelope.status_code !== SUCCESS_STATUS_CODE) {
    throw new ApiError(envelope.message ?? "Request failed", envelope.status_code);
  }
  return payload as T;
};

export const httpClient = {
  get: <T>(path: string): Promise<T> => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown): Promise<T> => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body: unknown): Promise<T> => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body: unknown): Promise<T> => request<T>(path, { method: "PATCH", body }),
  delete: (path: string): Promise<void> => request<void>(path, { method: "DELETE" })
};
