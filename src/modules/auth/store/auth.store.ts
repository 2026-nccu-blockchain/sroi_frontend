import { defineStore } from "pinia";

import { login } from "@/modules/auth/api/auth.api";
import type { AuthUser, LoginPayload } from "@/modules/auth/types/auth.types";

interface AuthState {
  user: AuthUser | null;
}

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    user: null
  }),
  actions: {
    async login(payload: LoginPayload): Promise<void> {
      this.user = await login(payload);
    },
    logout(): void {
      this.user = null;
    }
  }
});
