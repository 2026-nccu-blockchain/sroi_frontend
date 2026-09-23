import { httpClient } from "@/shared/api/http";
import type { ProfileResponse } from "@/modules/profile/types/profile.types";

export const getProfile = (): Promise<ProfileResponse> =>
  httpClient.get<ProfileResponse>("/api/v1/user/profile");

