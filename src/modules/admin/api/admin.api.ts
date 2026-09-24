import { httpClient, type ApiEnvelope } from "@/shared/api/http";
import type {
  AllUserResponse,
  ManagedRole,
  OneUserResponse,
  ReviewDecision,
  ReviewKind,
  RoleAction,
  SearchUserResponse
} from "@/modules/admin/types/admin.types";

const ROLE_ENDPOINTS: Record<ManagedRole, Record<RoleAction, string>> = {
  admin: { add: "add_admin", remove: "remove_admin" },
  db_editor: { add: "add_db_editor", remove: "remove_db_editor" }
};

const REVIEW_ENDPOINTS: Record<ReviewKind, Record<ReviewDecision, string>> = {
  verification: { approve: "confirm_verification", reject: "unconfirm_verification" },
  change: { approve: "confirm_change", reject: "unconfirm_change" }
};

export const getAllUsers = (): Promise<AllUserResponse> =>
  httpClient.get<AllUserResponse>("/admin/all_user");

export const searchUsers = (search: string): Promise<SearchUserResponse> =>
  httpClient.get<SearchUserResponse>(`/admin/search_user?${new URLSearchParams({ Search: search })}`);

export const updateUserRole = (role: ManagedRole, action: RoleAction, userId: string): Promise<ApiEnvelope> =>
  httpClient.post<ApiEnvelope>(`/admin/${ROLE_ENDPOINTS[role][action]}/${encodeURIComponent(userId)}`);

export const getOneUser = (userId: string): Promise<OneUserResponse> =>
  httpClient.get<OneUserResponse>(`/admin/one_user/${encodeURIComponent(userId)}`);

export const reviewRequest = (kind: ReviewKind, decision: ReviewDecision, userId: string): Promise<ApiEnvelope> =>
  httpClient.post<ApiEnvelope>(`/admin/${REVIEW_ENDPOINTS[kind][decision]}/${encodeURIComponent(userId)}`);

// 圖片需要帶 token，不能直接放在 <img src>
export const getIdCardImage = (filename: string): Promise<Blob> =>
  httpClient.getBlob(`/admin/id_card/${encodeURIComponent(filename)}`);
