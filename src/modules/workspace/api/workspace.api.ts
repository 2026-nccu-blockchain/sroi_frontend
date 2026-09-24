import { httpClient } from "@/shared/api/http";
import { ApiEnvelope } from "@/shared/api/http";
import type {
  GroupListResponse,
  GroupPayload,
  GroupInfoResponse,
  GroupRoleResponse,
  GroupUserSearchResponse,
  InviteMemberPayload,
  ChangeRolePayload
} from "@/modules/workspace/types/workspace.types";

export const getGroups = (): Promise<GroupListResponse> =>
  httpClient.get<GroupListResponse>("/api/v1/user/my_group");

export const newGroup = (payload: GroupPayload): Promise<ApiEnvelope> =>
  httpClient.post<ApiEnvelope>("/api/v1/user/add_group", payload);

export const getGroupInfo = (groupId: string): Promise<GroupInfoResponse> =>
  httpClient.get<GroupInfoResponse>(`/api/v1/group/group_info/${encodeURIComponent(groupId)}`);

export const getGroupRole = (groupId: string): Promise<GroupRoleResponse> =>
  httpClient.get<GroupRoleResponse>(`/api/v1/group/group_role/${encodeURIComponent(groupId)}`);

export const searchGroupUsers = (groupId: string, search: string): Promise<GroupUserSearchResponse> =>
  httpClient.get<GroupUserSearchResponse>(
    `/api/v1/group/search_user?${new URLSearchParams({ GroupId: groupId, Search: search })}`
  );

export const inviteGroupMember = (groupId: string, payload: InviteMemberPayload): Promise<ApiEnvelope> =>
  httpClient.post<ApiEnvelope>(`/api/v1/group/invite/${encodeURIComponent(groupId)}`, payload);

export const changeMemberRole = (groupId: string, payload: ChangeRolePayload): Promise<ApiEnvelope> =>
  httpClient.post<ApiEnvelope>(`/api/v1/group/change_permission/${encodeURIComponent(groupId)}`, payload);

export const deleteGroupMember = (groupId: string, userId: string): Promise<ApiEnvelope> =>
  httpClient.delete<ApiEnvelope>(
    `/api/v1/group/group_member?${new URLSearchParams({ GroupId: groupId, UserId: userId })}`
  );
