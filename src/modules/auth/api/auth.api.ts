import { httpClient } from "@/shared/api/http";
import type { ApiEnvelope } from "@/shared/api/http";
import type {
  EnrollmentResponse,
  LoginPayload,
  RegisterPayload,
  LoginResponse,
  ProfileResponse,
  SendCodePayload,
  VerifyCodePayload,
  VerifyCodeResponse
} from "@/modules/auth/types/auth.types";

export const login = (payload: LoginPayload): Promise<LoginResponse> =>
  httpClient.post<LoginResponse>("/auth/user/login", payload);

export const getProfile = (): Promise<ProfileResponse> =>
  httpClient.get<ProfileResponse>("/user/profile");

export const getEnrollment = (): Promise<EnrollmentResponse> =>
  httpClient.get<EnrollmentResponse>("/user/enrollment");

// 在學證明：PDF、JPG、PNG，上限 5 MB
export const uploadEnrollmentProof = (file: File): Promise<EnrollmentResponse> => {
  const body = new FormData();
  body.append("file", file);
  return httpClient.post<EnrollmentResponse>("/user/enrollment/proof", body);
};

export const register = (payload: RegisterPayload): Promise<ApiEnvelope> =>
  httpClient.post<ApiEnvelope>("/auth/user/register", payload);

export const sendCode = (payload: SendCodePayload): Promise<ApiEnvelope> =>
  httpClient.post<ApiEnvelope>("/auth/user/send_code", payload);

export const verifyCode = (payload: VerifyCodePayload): Promise<VerifyCodeResponse> =>
  httpClient.post<VerifyCodeResponse>("/auth/user/verify_code", payload);
