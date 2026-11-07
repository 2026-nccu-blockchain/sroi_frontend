import { httpClient, type ApiEnvelope } from "@/shared/api/http";
import type {
  CampusIdChangePayload,
  ChangeEmailPayload,
  ChangePasswordPayload,
  ProfileResponse
} from "@/modules/profile/types/profile.types";

export const getProfile = (): Promise<ProfileResponse> =>
  httpClient.get<ProfileResponse>("/user/profile");

export const changeEmail = (payload: ChangeEmailPayload): Promise<ApiEnvelope> =>
  httpClient.put<ApiEnvelope>("/auth/user/change_email", payload);

export const changePassword = (payload: ChangePasswordPayload): Promise<ApiEnvelope> =>
  httpClient.put<ApiEnvelope>("/auth/user/change_password", payload);

export const changeCampusId = (payload: CampusIdChangePayload): Promise<ApiEnvelope> =>
  httpClient.post<ApiEnvelope>("/user/change_campus_id", payload);
