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
  ProjectCostsResponse,
  ProjectCreatePayload,
  ProjectPayload,
  StakeholderSROI,
  StakeholderSROIPayload,
  TempInterviewFile,
  WorkspaceProject
} from "@/modules/workspace/types/workspace.types";

export const getProjects = (): Promise<WorkspaceProject[]> =>
  httpClient.get<WorkspaceProject[]>("/project");

// 共用資料庫：所有已發布至資料庫的專案，不限自己能存取的
export const getPublishedProjects = (): Promise<WorkspaceProject[]> =>
  httpClient.get<WorkspaceProject[]>("/project/published");

// 審核專案：所有審核中的專案，只有資料庫編輯者能取得
export const getReviewingProjects = (): Promise<WorkspaceProject[]> =>
  httpClient.get<WorkspaceProject[]>("/project/reviewing");

// 指定群組的專案；管理員看非成員的群組也可以（只能檢視）
export const getGroupProjects = (groupId: string): Promise<WorkspaceProject[]> =>
  httpClient.get<WorkspaceProject[]>(`/project?${new URLSearchParams({ group_id: groupId })}`);

export const getProject = (projectId: string): Promise<WorkspaceProject> =>
  httpClient.get<WorkspaceProject>(`/project/${encodeURIComponent(projectId)}`);

export const createProject = (payload: ProjectCreatePayload): Promise<WorkspaceProject> =>
  httpClient.post<WorkspaceProject>("/project", payload);

export const updateProject = (projectId: string, payload: Partial<ProjectPayload>): Promise<WorkspaceProject> =>
  httpClient.patch<WorkspaceProject>(`/project/${encodeURIComponent(projectId)}`, payload);

export const deleteProject = (projectId: string): Promise<void> =>
  httpClient.delete(`/project/${encodeURIComponent(projectId)}`);

// 結案、發布至資料庫都只有組長能做，且無法復原
export const closeProject = (projectId: string): Promise<WorkspaceProject> =>
  httpClient.post<WorkspaceProject>(`/project/${encodeURIComponent(projectId)}/close`);

// 送出後進入審核中，資料庫編輯者同意後才會發布
export const publishProject = (projectId: string): Promise<WorkspaceProject> =>
  httpClient.post<WorkspaceProject>(`/project/${encodeURIComponent(projectId)}/publish`);

// 資料庫編輯者審核：同意則發布，不同意則退回已結案
export const reviewProject = (projectId: string, approved: boolean): Promise<WorkspaceProject> =>
  httpClient.post<WorkspaceProject>(`/project/${encodeURIComponent(projectId)}/review`, { approved });

export const getStakeholderSROI = (
  projectId: string,
  stakeholderId: string
): Promise<StakeholderSROI> =>
  httpClient.get<StakeholderSROI>(
    `/project/${encodeURIComponent(projectId)}/stakeholders/${encodeURIComponent(stakeholderId)}/sroi`
  );

export const saveStakeholderSROI = (
  projectId: string,
  stakeholderId: string,
  payload: StakeholderSROIPayload
): Promise<StakeholderSROI> =>
  httpClient.put<StakeholderSROI>(
    `/project/${encodeURIComponent(projectId)}/stakeholders/${encodeURIComponent(stakeholderId)}/sroi`,
    payload
  );

export const getProjectCosts = (projectId: string): Promise<ProjectCostsResponse> =>
  httpClient.get<ProjectCostsResponse>(`/project/${encodeURIComponent(projectId)}/costs`);

// 先存到後端暫存資料夾，按「儲存專案」時才正式存入
export const uploadTempInterviewFile = (projectId: string, file: File): Promise<TempInterviewFile> => {
  const body = new FormData();
  body.append("file", file);
  return httpClient.post<TempInterviewFile>(
    `/project/${encodeURIComponent(projectId)}/interview-files/temp`,
    body
  );
};

export const downloadProjectInterviewFile = (projectId: string, fileId: string): Promise<Blob> =>
  httpClient.getBlob(
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

export const updateGroup = (groupId: string, payload: GroupPayload): Promise<ApiEnvelope> =>
  httpClient.put<ApiEnvelope>(`/group/update/${encodeURIComponent(groupId)}`, payload);

export const deleteGroup = (groupId: string): Promise<ApiEnvelope> =>
  httpClient.delete<ApiEnvelope>(`/group/${encodeURIComponent(groupId)}`);
