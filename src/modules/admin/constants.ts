import { ApiError, toErrorMessage } from "@/shared/api/error-handler";
import type { AdminProjectScope, ManagedRole, UserRole, UserTab } from "@/modules/admin/types/admin.types";
import { ROLE_LABELS } from "@/modules/profile/constants";

const ADMIN_ERROR_MESSAGES: Record<string, string> = {
  "10001": "找不到使用者，或該使用者目前的角色無法執行此操作",
  "10008": "權限不足，只有管理員可以管理使用者",
  "10013": "找不到群組，或群組已經審核過",
  "10015": "無法變更自己的權限",
  "10016": "群組至少需要一位組長",
  "10017": "權限沒有變更",
  "10022": "請選擇要變更的權限",
  "10023": "此群組沒有申請人，無法通過審核",
  "10034": "找不到這份在學證明，或已經審核過"
};

export const TAB_LABELS: Record<UserTab, string> = {
  ...(ROLE_LABELS as Record<UserRole, string>),
  enrollment: "在學驗證"
};

export const toAdminErrorMessage = (err: unknown): string =>
  err instanceof ApiError && err.statusCode && ADMIN_ERROR_MESSAGES[err.statusCode]
    ? ADMIN_ERROR_MESSAGES[err.statusCode]
    : toErrorMessage(err);

export const ADMIN_PROJECT_SCOPES: AdminProjectScope[] = ["all", "personal", "group"];

export const ADMIN_PROJECT_SCOPE_LABELS: Record<AdminProjectScope, string> = {
  all: "所有專案",
  personal: "個人專案",
  group: "群組專案"
};

export const isAdminProjectScope = (value: unknown): value is AdminProjectScope =>
  typeof value === "string" && (ADMIN_PROJECT_SCOPES as string[]).includes(value);

// 與後端 add_admin / add_db_editor 可接受的原角色一致
export const ADD_ALLOWED_ROLES: Record<ManagedRole, UserRole[]> = {
  admin: ["normal", "db_editor"],
  db_editor: ["normal"]
};
