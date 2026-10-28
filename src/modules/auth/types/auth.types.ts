import type { ApiEnvelope } from "@/shared/api/http";

// email 相關欄位都只傳 @ 前面的部分
export interface LoginPayload {
  email_prefix: string;
  password: string;
}

export interface SendCodePayload {
  email_prefix: string;
}

export interface VerifyCodePayload {
  email_prefix: string;
  code: string;
}

export interface VerifyCodeResponse extends ApiEnvelope {
  register_token: string;
}

// 註冊流程：寄驗證碼 → 輸入驗證碼 → 填寫資料，都在同一頁
export type RegisterStep = "email" | "code" | "profile";

// email 由驗證碼通過後拿到的 register_token 提供
export interface RegisterPayload {
  register_token: string;
  password: string;
  name: string;
}

export interface LoginResponse extends ApiEnvelope {
  token: string;
}

export interface ProfileResponse extends ApiEnvelope {
  user_id: string;
  campus_id?: string; // 還沒申請過學號的帳號沒有學號
  email: string; // 只有 @ 前面的部分
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
