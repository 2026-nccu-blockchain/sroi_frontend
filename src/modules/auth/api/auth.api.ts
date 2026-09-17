import { httpClient } from "@/shared/api/http";
import { ApiEnvelope } from "@/shared/api/http";
import type { LoginPayload, RegisterPayload, LoginResponse, ProfileResponse } from "@/modules/auth/types/auth.types";

export const login = (payload: LoginPayload): Promise<LoginResponse> =>
  httpClient.post<LoginResponse>("/api/v1/auth/user/login", payload);

export const getProfile = (): Promise<ProfileResponse> =>
  httpClient.get<ProfileResponse>("/api/v1/user/profile");

export const register = (payload: RegisterPayload): Promise<ApiEnvelope> =>
  httpClient.post<ApiEnvelope>("/api/v1/auth/user/register", payload);