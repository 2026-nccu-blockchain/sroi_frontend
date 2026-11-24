import { httpClient, type ApiEnvelope } from "@/shared/api/http";
import type {
  AdminProjectPage,
  AdminProjectQuery,
  AllGroupsResponse,
  AllUserResponse,
  ManagedRole,
  OneGroupResponse,
  OneUserResponse,
  RoleAction,
  SearchUserResponse
} from "@/modules/admin/types/admin.types";

const ROLE_ENDPOINTS: Record<ManagedRole, Record<RoleAction, string>> = {
  admin: { add: "add_admin", remove: "remove_admin" },
  db_editor: { add: "add_db_editor", remove: "remove_db_editor" }
};

export const getAllUsers = (): Promise<AllUserResponse> =>
  httpClient.get<AllUserResponse>("/admin/all_user");

export const searchUsers = (search: string): Promise<SearchUserResponse> =>
  httpClient.get<SearchUserResponse>(`/admin/search_user?${new URLSearchParams({ Search: search })}`);

export const updateUserRole = (role: ManagedRole, action: RoleAction, userId: string): Promise<ApiEnvelope> =>
  httpClient.post<ApiEnvelope>(`/admin/${ROLE_ENDPOINTS[role][action]}/${encodeURIComponent(userId)}`);

// 停權：只能停權一般使用者；停權後不能登入，也不能用相同的學號（email 前綴）重新註冊
export const suspendUser = (userId: string): Promise<ApiEnvelope> =>
  httpClient.post<ApiEnvelope>(`/admin/suspend_user/${encodeURIComponent(userId)}`);

export const getOneUser = (userId: string): Promise<OneUserResponse> =>
  httpClient.get<OneUserResponse>(`/admin/one_user/${encodeURIComponent(userId)}`);

// 在學驗證：查看證明檔案、通過（延長一年）、退回（要填原因）
export const getEnrollmentProof = (verificationId: string): Promise<Blob> =>
  httpClient.getBlob(`/admin/enrollment_proof/${encodeURIComponent(verificationId)}`);

export const approveEnrollment = (verificationId: string): Promise<ApiEnvelope> =>
  httpClient.post<ApiEnvelope>(`/admin/approve_enrollment/${encodeURIComponent(verificationId)}`);

export const rejectEnrollment = (verificationId: string, reason: string): Promise<ApiEnvelope> =>
  httpClient.post<ApiEnvelope>(`/admin/reject_enrollment/${encodeURIComponent(verificationId)}`, { reason });

export const getAllGroups = (): Promise<AllGroupsResponse> =>
  httpClient.get<AllGroupsResponse>("/admin/all_groups");

export const getOneGroup = (groupId: string): Promise<OneGroupResponse> =>
  httpClient.get<OneGroupResponse>(`/admin/one_group/${encodeURIComponent(groupId)}`);

export const approveGroup = (groupId: string): Promise<ApiEnvelope> =>
  httpClient.post<ApiEnvelope>(`/admin/confirm_group/${encodeURIComponent(groupId)}`);

export const getAllProjects = (query: AdminProjectQuery): Promise<AdminProjectPage> =>
  httpClient.get<AdminProjectPage>(
    `/project/all?${new URLSearchParams({
      scope: query.scope,
      phase: query.phase,
      q: query.q,
      page: String(query.page),
      page_size: String(query.page_size)
    })}`
  );

export const rejectGroup = (groupId: string, reason: string): Promise<ApiEnvelope> =>
  httpClient.post<ApiEnvelope>(`/admin/unconfirm_group/${encodeURIComponent(groupId)}`, { reason });
