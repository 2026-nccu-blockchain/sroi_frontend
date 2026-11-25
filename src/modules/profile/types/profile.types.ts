import { ApiEnvelope } from "@/shared/api/http";

export interface Profile{
  user_id: string;
  // 只有學生有學號
  campus_id: string | null;
  email: string;
  name: string;
  role: string;
}

export interface ProfileResponse extends ApiEnvelope, Profile {}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
}
