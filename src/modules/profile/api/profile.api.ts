import { httpClient, type ApiEnvelope } from "@/shared/api/http";
import type {
  CampusIdRequestPayload,
  ChangeEmailPayload,
  ChangePasswordPayload,
  ProfileResponse,
  UploadImageResponse
} from "@/modules/profile/types/profile.types";

export const getProfile = (): Promise<ProfileResponse> =>
  httpClient.get<ProfileResponse>("/user/profile");

export const changeEmail = (payload: ChangeEmailPayload): Promise<ApiEnvelope> =>
  httpClient.put<ApiEnvelope>("/auth/user/change_email", payload);

export const changePassword = (payload: ChangePasswordPayload): Promise<ApiEnvelope> =>
  httpClient.put<ApiEnvelope>("/auth/user/change_password", payload);

export const uploadImage = (image: File): Promise<UploadImageResponse> => {
  const form = new FormData();
  form.append("image", image);
  return httpClient.post<UploadImageResponse>("/upload/image", form);
};

export const requestVerification = (payload: CampusIdRequestPayload): Promise<ApiEnvelope> =>
  httpClient.post<ApiEnvelope>("/user/request_verification", payload);

export const changeCampusId = (payload: CampusIdRequestPayload): Promise<ApiEnvelope> =>
  httpClient.post<ApiEnvelope>("/user/change_campus_id", payload);
