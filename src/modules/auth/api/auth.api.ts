import type { AuthUser, LoginPayload } from "@/modules/auth/types/auth.types";
import { httpClient } from "@/shared/api/http";

interface LoginResponse {
  token: string;
}

const getTokenUserId = (token: string): string => {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return String((JSON.parse(window.atob(normalized)) as { user_id?: string }).user_id ?? "");
  } catch {
    return "";
  }
};

export const login = async (payload: LoginPayload): Promise<AuthUser> => {
  const response = await httpClient.post<LoginResponse>("/auth/user/login", payload);
  return {
    user_id: getTokenUserId(response.token),
    email: payload.email,
    token: response.token
  };
};
