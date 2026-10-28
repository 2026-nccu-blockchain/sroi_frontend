import { ApiEnvelope } from "@/shared/api/http";

export interface Profile{
  user_id: string;
  campus_id: string;
  email: string;
  name: string;
  role: string;
}

export interface ProfileResponse extends ApiEnvelope, Profile {}

export interface ChangeEmailPayload {
  email_prefix: string;
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
}

export interface CampusIdChangePayload {
  campus_id: string;
}
