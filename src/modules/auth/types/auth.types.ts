import type { ApiEnvelope } from "@/shared/api/http";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
}

export interface LoginResponse extends ApiEnvelope {
  token: string;
}

export interface ProfileResponse extends ApiEnvelope {
  user_id: string;
  campus_id?: string; // 還沒申請過學號的帳號沒有學號
  email: string;
  name: string;
  role?: string;
}

export interface AuthUser {
  user_id: string;
  campus_id?: string;
  email?: string;
  name?: string;
  role?: string;
}
