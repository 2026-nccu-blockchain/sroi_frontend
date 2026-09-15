import type { AuthUser, LoginPayload } from "@/modules/auth/types/auth.types";

export const login = async (payload: LoginPayload): Promise<AuthUser> => {
  await Promise.resolve();
  return {
    id: "demo-user-id",
    email: payload.email
  };
};
  