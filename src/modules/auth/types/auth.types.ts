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
  campus_id?: string; // 未驗證帳號沒有學號，後端不會回傳
  email: string;
  name: string;
  role: string;
}

export interface AuthUser {
  user_id: string;
  campus_id?: string;
  email?: string;
  name?: string;
  role?: string;
}