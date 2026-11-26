import { httpClient, type ApiEnvelope } from "@/shared/api/http";
import type { ChangePasswordPayload, ProfileResponse } from "@/modules/profile/types/profile.types";

export const getProfile = (): Promise<ProfileResponse> =>
  httpClient.get<ProfileResponse>("/user/profile");

// 註冊後不能改 email（學號就是 email 前綴），只能改密碼
export const changePassword = (payload: ChangePasswordPayload): Promise<ApiEnvelope> =>
  httpClient.put<ApiEnvelope>("/auth/user/change_password", payload);
