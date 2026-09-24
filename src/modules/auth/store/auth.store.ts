import { defineStore } from "pinia";

import { login as loginRequest, getProfile } from "@/modules/auth/api/auth.api";
import type { AuthUser, LoginPayload } from "@/modules/auth/types/auth.types";
import { AUTH_TOKEN_COOKIE_NAME } from "@/shared/constants";
import { getCookie, removeCookie, setCookie } from "@/shared/utils/cookie";
import { decodeJwt, isJwtExpired, type JwtPayload } from "@/shared/utils/jwt";

interface AuthJwtPayload extends JwtPayload {
  user_id: string;
}

interface AuthState {
  user: AuthUser | null;
}

const loadUserFromToken = (): AuthUser | null => {
  const token = getCookie(AUTH_TOKEN_COOKIE_NAME);
  if (!token) return null;

  const payload = decodeJwt<AuthJwtPayload>(token);
  if (!payload || isJwtExpired(payload)) {
    removeCookie(AUTH_TOKEN_COOKIE_NAME);
    return null;
  }

  return { user_id: payload.user_id };
};

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    user: loadUserFromToken()
  }),
  actions: {
    async login(payload: LoginPayload): Promise<void> {
      const { token } = await loginRequest(payload);
      setCookie(AUTH_TOKEN_COOKIE_NAME, token);

      const decoded = decodeJwt<AuthJwtPayload>(token);
      this.user = decoded ? { user_id: decoded.user_id, email: payload.email } : null;

      // 未驗證帳號可能無法取得完整 profile，但仍可使用表單功能。
      await this.fetchProfile().catch(() => undefined);
    },
    async fetchProfile(): Promise<void> {
      if (!this.user) return;

      const { user_id, campus_id, email, name, role } = await getProfile();
      this.user = { user_id, campus_id, email, name, role };
    },
    logout(): void {
      this.user = null;
      removeCookie(AUTH_TOKEN_COOKIE_NAME);
    }
  }
});
