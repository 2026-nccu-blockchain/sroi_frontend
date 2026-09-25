import { ApiError, toErrorMessage } from "@/shared/api/error-handler";
import type { ManagedRole, UserRole, UserTab } from "@/modules/admin/types/admin.types";
import { ROLE_LABELS } from "@/modules/profile/constants";

const ADMIN_ERROR_MESSAGES: Record<string, string> = {
  "10001": "找不到使用者，或該使用者目前的角色無法執行此操作",
  "10008": "權限不足，只有管理員可以管理使用者",
  "10012": "此學號已被其他帳號使用",
  "10013": "找不到群組，或群組已經審核過",
  "10015": "無法變更自己的權限",
  "10021": "找不到圖片"
};

export const TAB_LABELS: Record<UserTab, string> = {
  ...(ROLE_LABELS as Record<UserRole, string>),
  change_request: "學號變更"
};

export const toAdminErrorMessage = (err: unknown): string =>
  err instanceof ApiError && err.statusCode && ADMIN_ERROR_MESSAGES[err.statusCode]
    ? ADMIN_ERROR_MESSAGES[err.statusCode]
    : toErrorMessage(err);

// 與後端 add_admin / add_db_editor 可接受的原角色一致
export const ADD_ALLOWED_ROLES: Record<ManagedRole, UserRole[]> = {
  admin: ["verified", "db_editor"],
  db_editor: ["verified"]
};
