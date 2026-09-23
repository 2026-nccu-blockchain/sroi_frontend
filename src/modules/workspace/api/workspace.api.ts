import { httpClient } from "@/shared/api/http";
import { ApiEnvelope } from "@/shared/api/http";
import type { GroupListResponse, GroupPayload } from "@/modules/workspace/types/workspace.types";

export const getGroups = (): Promise<GroupListResponse> =>
  httpClient.get<GroupListResponse>("/api/v1/user/my_group");

export const newGroup = (payload: GroupPayload): Promise<ApiEnvelope> =>
  httpClient.post<ApiEnvelope>("/api/v1/user/add_group", payload);