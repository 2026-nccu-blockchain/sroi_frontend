import { ApiError, hasChinese } from "@/shared/api/error-handler";
import { AUTH_TOKEN_COOKIE_NAME } from "@/shared/constants";
import { getCookie } from "@/shared/utils/cookie";

// 部署時由 nginx、開發時由 Vite proxy 把 /api 轉給後端
const API_BASE_URL = "/api/v1";
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

const STATUS_MESSAGES: Record<number, string> = {
  400: "送出的資料有誤，請檢查後再試",
  401: "登入已失效，請重新登入",
  403: "權限不足，無法執行這個操作",
  404: "找不到資料，可能已被刪除",
  409: "資料已被變更，請重新整理後再試",
  413: "檔案太大，無法上傳",
  422: "送出的資料格式不正確，請檢查後再試",
  429: "操作太頻繁，請稍後再試"
};

// 後端訊息多為英文（或 422 的物件陣列），畫面只顯示中文：
// 已是中文就沿用，否則依 HTTP 狀態碼給中文說明。各頁面仍可用 statusCode 對應更精確的訊息
const toChineseMessage = (raw: unknown, status?: number): string => {
  if (typeof raw === "string" && hasChinese(raw)) return raw;
  if (status && STATUS_MESSAGES[status]) return STATUS_MESSAGES[status];
  if (status && status >= 500) return "伺服器發生錯誤，請稍後再試";
  return "操作失敗，請稍後再試";
};

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const token = getCookie(AUTH_TOKEN_COOKIE_NAME);
  const { body, responseType = "json", ...init } = options;
  const isFormData = body instanceof FormData;
  const headers = new Headers(init.headers);

  headers.set("Accept", "application/json");
  if (body !== undefined && !isFormData) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    // 瀏覽器的網路錯誤訊息是英文（Failed to fetch），改成中文
    throw new HttpError("無法連線到伺服器，請檢查網路後再試", 0);
  }

  if (response.status === 401 && token) unauthorizedHandler?.();
  if (response.status === 204) {
    if (!response.ok) throw new HttpError(toChineseMessage(undefined, response.status), response.status);
    return undefined as T;
  }

  // 錯誤時後端仍回 JSON，所以只有成功時才讀成 blob
  if (response.ok && responseType === "blob") return await response.blob() as T;

  const payload = await response.json().catch(() => undefined) as T | ApiErrorBody | undefined;

  if (!response.ok) {
    const error = payload as ApiErrorBody | undefined;
    throw new HttpError(
      toChineseMessage(error?.message ?? error?.detail, response.status),
      response.status,
      error?.status_code
    );
  }

  if (isApiEnvelope(payload) && payload.status_code !== SUCCESS_STATUS_CODE) {
    throw new ApiError(toChineseMessage(payload.message), payload.status_code);
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
