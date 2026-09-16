import { httpClient } from "@/shared/api/http";
import type { LoginPayload, LoginResponse } from "@/modules/auth/types/auth.types";

export const login = (payload: LoginPayload): Promise<LoginResponse> =>
  httpClient.post<LoginResponse>("/api/v1/auth/user/login", payload);