import { httpClient } from "@/shared/api/http";
import type { GroupListResponse } from "@/modules/workspace/types/workspace.types";

export const getGroups = (): Promise<GroupListResponse> =>
  httpClient.get<GroupListResponse>("/api/v1/user/my_group");
