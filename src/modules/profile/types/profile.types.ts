import { ApiEnvelope } from "@/shared/api/http";

export interface Profile{
  user_id: string;
  campus_id: string;
  email: string;
  name: string;
  role: string;
}

export interface ProfileResponse extends ApiEnvelope, Profile {}