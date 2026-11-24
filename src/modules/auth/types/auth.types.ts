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

// 在學驗證狀態：not_student 非學生；active 還沒到驗證期；required 驗證期內還沒上傳；
// pending 已上傳等審核；rejected 被退回；expired 逾期（帳號會被刪除）
export type EnrollmentState = "not_student" | "active" | "required" | "pending" | "rejected" | "expired";

export interface EnrollmentSubmission {
  verification_id: string;
  status: "pending" | "approved" | "rejected";
  reason: string | null;
  original_name: string;
  size_bytes: number;
  create_time: string | null;
  reviewed_at: string | null;
}

export interface EnrollmentInfo {
  is_student: boolean;
  campus_id: string | null;
  state: EnrollmentState;
  // 下次要驗證的民國年；當年 9/1 起驗證、10/1 00:00 截止
  due_year: number | null;
  window_start: string | null;
  deadline: string | null;
  // 這一期最新一次上傳
  latest: EnrollmentSubmission | null;
}

export interface EnrollmentResponse extends ApiEnvelope {
  enrollment: EnrollmentInfo;
}

export interface ProfileResponse extends ApiEnvelope {
  user_id: string;
  // email 前綴是 9 碼數字才是學生，學號就是前綴；其他帳號沒有學號
  campus_id?: string | null;
  email: string; // 只有 @ 前面的部分
  name: string;
  role?: string;
  enrollment?: EnrollmentInfo;
}

export interface AuthUser {
  user_id: string;
  campus_id?: string | null;
  email?: string;
  name?: string;
  role?: string;
  enrollment?: EnrollmentInfo;
}
