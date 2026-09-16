import type { ApiEnvelope } from "@/shared/api/http";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse extends ApiEnvelope {
  token: string;
}

export interface AuthUser {
  user_id: string;
}