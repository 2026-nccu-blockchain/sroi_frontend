import { defineStore } from "pinia";

import { login } from "@/modules/auth/api/auth.api";
import type { AuthUser, LoginPayload } from "@/modules/auth/types/auth.types";

interface AuthState {
  user: AuthUser | null;
}

const AUTH_STORAGE_KEY = "sroi.auth.user";

const loadStoredUser = (): AuthUser | null => {
  const storedUser = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    user: loadStoredUser()
  }),
  actions: {
    async login(payload: LoginPayload): Promise<void> {
      this.user = await login(payload);
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(this.user));
    },
    logout(): void {
      this.user = null;
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }
});
