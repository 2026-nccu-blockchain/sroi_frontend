import type { ApiEnvelope } from "@/shared/api/http";
import type { Group, GroupInfo } from "@/modules/workspace/types/workspace.types";

export type UserRole = "admin" | "db_editor" | "normal";
export type ManagedRole = "admin" | "db_editor";
export type RoleAction = "add" | "remove";

// 學號變更申請不是角色，但在所有使用者頁面中也是一個分頁
export type UserTab = UserRole | "change_request";

export type ReviewDecision = "approve" | "reject";

export interface AdminUser {
  user_id: string;
  campus_id: string;
  name: string;
  // 只有學號變更申請清單會帶
  new_campus_id?: string;
}

// 還沒申請過學號的帳號，後端回傳 null
export type RawAdminUser = Omit<AdminUser, "campus_id"> & { campus_id?: string };

export type UserListField =
  | "admin"
  | "db_editor"
  | "normal_user"
  | "change_request_user";

export interface AllUserResponse extends ApiEnvelope, Record<UserListField, RawAdminUser[]> {}

export interface SearchUserResponse extends ApiEnvelope {
  users: AdminUser[];
}

export interface ChangeRequest {
  campus_id: string;
  create_time: string;
}

export interface AdminUserDetail {
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  campus_id?: string;
  change_request?: ChangeRequest;
}

export interface OneUserResponse extends ApiEnvelope, AdminUserDetail {}

export interface AllGroupsResponse extends ApiEnvelope {
  agree_groups: Group[];
  in_progress_groups: Group[];
  disagree_groups: Group[];
}

export interface OneGroupResponse extends ApiEnvelope, GroupInfo {}
