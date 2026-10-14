import { httpClient } from "@/shared/api/http";
import { ApiEnvelope } from "@/shared/api/http";
import type {
  GroupListResponse,
  GroupPayload,
  GroupInfoResponse,
  GroupRoleResponse,
  GroupUserSearchResponse,
  InviteMemberPayload,
  ChangeRolePayload,
  ProjectPayload,
  ProjectInterviewFile,
  WorkspaceProject
} from "@/modules/workspace/types/workspace.types";

export const getProjects = (): Promise<WorkspaceProject[]> =>
  httpClient.get<WorkspaceProject[]>("/project");

export const getProject = (projectId: string): Promise<WorkspaceProject> =>
  httpClient.get<WorkspaceProject>(`/project/${encodeURIComponent(projectId)}`);

export const createProject = (payload: ProjectPayload): Promise<WorkspaceProject> =>
  httpClient.post<WorkspaceProject>("/project", payload);

export const updateProject = (projectId: string, payload: Partial<ProjectPayload>): Promise<WorkspaceProject> =>
  httpClient.patch<WorkspaceProject>(`/project/${encodeURIComponent(projectId)}`, payload);

export const deleteProject = (projectId: string): Promise<void> =>
  httpClient.delete(`/project/${encodeURIComponent(projectId)}`);

export const uploadProjectInterviewFile = (projectId: string, file: File): Promise<ProjectInterviewFile> => {
  const body = new FormData();
  body.append("file", file);
  return httpClient.post<ProjectInterviewFile>(
    `/project/${encodeURIComponent(projectId)}/interview-files`,
    body
  );
};

export const downloadProjectInterviewFile = (projectId: string, fileId: string): Promise<Blob> =>
  httpClient.getBlob(
    `/project/${encodeURIComponent(projectId)}/interview-files/${encodeURIComponent(fileId)}`
  );

export const deleteProjectInterviewFile = (projectId: string, fileId: string): Promise<void> =>
  httpClient.delete(
    `/project/${encodeURIComponent(projectId)}/interview-files/${encodeURIComponent(fileId)}`
  );

export const getGroups = (): Promise<GroupListResponse> =>
  httpClient.get<GroupListResponse>("/user/my_group");

export const newGroup = (payload: GroupPayload): Promise<ApiEnvelope> =>
  httpClient.post<ApiEnvelope>("/user/add_group", payload);

export const getGroupInfo = (groupId: string): Promise<GroupInfoResponse> =>
  httpClient.get<GroupInfoResponse>(`/group/group_info/${encodeURIComponent(groupId)}`);

export const getGroupRole = (groupId: string): Promise<GroupRoleResponse> =>
  httpClient.get<GroupRoleResponse>(`/group/group_role/${encodeURIComponent(groupId)}`);

export const searchGroupUsers = (groupId: string, search: string): Promise<GroupUserSearchResponse> =>
  httpClient.get<GroupUserSearchResponse>(
    `/group/search_user?${new URLSearchParams({ GroupId: groupId, Search: search })}`
  );

export const inviteGroupMember = (groupId: string, payload: InviteMemberPayload): Promise<ApiEnvelope> =>
  httpClient.post<ApiEnvelope>(`/group/invite/${encodeURIComponent(groupId)}`, payload);

export const changeMemberRole = (groupId: string, payload: ChangeRolePayload): Promise<ApiEnvelope> =>
  httpClient.post<ApiEnvelope>(`/group/change_permission/${encodeURIComponent(groupId)}`, payload);

export const deleteGroupMember = (groupId: string, userId: string): Promise<ApiEnvelope> =>
  httpClient.delete<ApiEnvelope>(
    `/group/group_member?${new URLSearchParams({ GroupId: groupId, UserId: userId })}`
  );
