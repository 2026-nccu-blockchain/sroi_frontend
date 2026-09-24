import type { ApiEnvelope } from "@/shared/api/http";

export type UserRole = "admin" | "db_editor" | "verified" | "in_progress" | "unverified";
export type ManagedRole = "admin" | "db_editor";
export type RoleAction = "add" | "remove";

// 學號變更申請不是角色，但在所有使用者頁面中也是一個分頁
export type UserTab = UserRole | "change_request";

// verification：驗證中帳號的首次驗證；change：已驗證帳號的學號變更
export type ReviewKind = "verification" | "change";
export type ReviewDecision = "approve" | "reject";

export interface AdminUser {
  user_id: string;
  campus_id: string;
  name: string;
  // 只有學號變更申請清單會帶
  new_campus_id?: string;
}

// 未驗證、驗證中的帳號沒有學號，後端不會回傳
export type RawAdminUser = Omit<AdminUser, "campus_id"> & { campus_id?: string };

export type UserListField =
  | "admin"
  | "db_editor"
  | "verified_user"
  | "in_progress_user"
  | "unverified_user"
  | "change_request_user";

export interface AllUserResponse extends ApiEnvelope, Record<UserListField, RawAdminUser[]> {}

export interface SearchUserResponse extends ApiEnvelope {
  users: AdminUser[];
}

export interface ChangeRequest {
  campus_id: string;
  id_card_link: string;
  create_time: string;
}

// 驗證中：campus_id / id_card_link 是申請中的資料；未驗證：兩者都沒有
export interface AdminUserDetail {
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  campus_id?: string;
  id_card_link?: string;
  change_request?: ChangeRequest;
}

export interface OneUserResponse extends ApiEnvelope, AdminUserDetail {}
