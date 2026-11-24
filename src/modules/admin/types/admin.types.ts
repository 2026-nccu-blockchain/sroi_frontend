import type { EnrollmentInfo } from "@/modules/auth/types/auth.types";
import type { ApiEnvelope } from "@/shared/api/http";
import type { Group, GroupInfo, ProjectListItem, ProjectPhaseTab } from "@/modules/workspace/types/workspace.types";

export type UserRole = "admin" | "db_editor" | "normal";
export type ManagedRole = "admin" | "db_editor";
export type RoleAction = "add" | "remove";

// 在學驗證不是角色，但在所有使用者頁面中也是一個分頁
export type UserTab = UserRole | "enrollment";

export type ReviewDecision = "approve" | "reject";

export interface AdminUser {
  user_id: string;
  campus_id: string;
  name: string;
  // 只有在學驗證清單會帶：上傳在學證明的時間
  submitted_at?: string;
}

// 不是學生的帳號沒有學號，後端不帶或回傳 null
export type RawAdminUser = Omit<AdminUser, "campus_id"> & { campus_id?: string };

export type UserListField =
  | "admin"
  | "db_editor"
  | "normal_user"
  | "enrollment_pending_user";

export interface AllUserResponse extends ApiEnvelope, Record<UserListField, RawAdminUser[]> {}

export interface SearchUserResponse extends ApiEnvelope {
  users: AdminUser[];
}

export interface AdminUserDetail {
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  campus_id?: string | null;
  enrollment?: EnrollmentInfo;
}

export interface OneUserResponse extends ApiEnvelope, AdminUserDetail {}

export interface AllGroupsResponse extends ApiEnvelope {
  agree_groups: Group[];
  in_progress_groups: Group[];
  disagree_groups: Group[];
}

export interface OneGroupResponse extends ApiEnvelope, GroupInfo {}

// 所有專案的第一層分頁
export type AdminProjectScope = "all" | "personal" | "group";

export interface AdminProjectQuery {
  scope: AdminProjectScope;
  phase: ProjectPhaseTab;
  q: string;
  page: number;
  page_size: number;
}

// 專案 API 不包 ApiEnvelope
export interface AdminProjectPage {
  items: ProjectListItem[];
  total: number;
  page: number;
  page_size: number;
  scope_counts: Record<AdminProjectScope, number>;
  // 目前 scope 底下各狀態的數量
  phase_counts: Record<ProjectPhaseTab, number>;
}
