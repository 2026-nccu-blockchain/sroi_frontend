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
  email: string;
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
}

export interface UploadImageResponse extends ApiEnvelope {
  id_card_link: string;
}

export interface CampusIdRequestPayload {
  campus_id: string;
  id_card_link: string;
}

export type CampusIdRequestMode = "verify" | "change";
