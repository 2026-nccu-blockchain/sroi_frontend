import { ApiError } from "@/shared/api/error-handler";
import { AUTH_TOKEN_COOKIE_NAME } from "@/shared/constants";
import { getCookie } from "@/shared/utils/cookie";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const SUCCESS_STATUS_CODE = "00000";

export interface ApiEnvelope {
  status_code: string;
  message: string;
  response_datetime: string;
}

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export const setUnauthorizedHandler = (handler: UnauthorizedHandler): void => {
  unauthorizedHandler = handler;
};

const request = async <T extends ApiEnvelope>(path: string, options: RequestOptions = {}): Promise<T> => {
  const token = getCookie(AUTH_TOKEN_COOKIE_NAME);

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });

  const payload = (await response.json().catch(() => undefined)) as T | undefined;

  if (response.status === 401 && token) {
    unauthorizedHandler?.();
  }

  if (!response.ok) {
    throw new ApiError(payload?.message ?? `Request failed with status ${response.status}`, payload?.status_code);
  }

  if (payload && payload.status_code !== SUCCESS_STATUS_CODE) {
    throw new ApiError(payload.message ?? "Request failed", payload.status_code);
  }

  return payload as T;
};

export const httpClient = {
  get: <T extends ApiEnvelope>(path: string): Promise<T> => request<T>(path, { method: "GET" }),
  post: <T extends ApiEnvelope>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, { method: "POST", body })
};