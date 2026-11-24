import { defineStore } from "pinia";

import { login as loginRequest, getProfile } from "@/modules/auth/api/auth.api";
import { ENROLLMENT_BLOCKING_STATES } from "@/modules/auth/constants";
import type { AuthUser, EnrollmentInfo, LoginPayload } from "@/modules/auth/types/auth.types";
import { AUTH_TOKEN_COOKIE_NAME } from "@/shared/constants";
import { getCookie, removeCookie, setCookie } from "@/shared/utils/cookie";
import { decodeJwt, isJwtExpired, type JwtPayload } from "@/shared/utils/jwt";
import { useFormStore } from "@/modules/forms/store/form.store";
import { useProjectStore } from "@/modules/workspace/store/project.store";

interface AuthJwtPayload extends JwtPayload {
  user_id: string;
}

interface AuthState {
  user: AuthUser | null;
  // 上次抓 profile 的時間；在學驗證狀態會隨時間改變，路由守衛會定期重抓
  profileFetchedAt: number;
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
    user: loadUserFromToken(),
    profileFetchedAt: 0
  }),
  getters: {
    // 需要在學驗證：只能使用驗證頁
    needsEnrollmentVerification(state): boolean {
      return ENROLLMENT_BLOCKING_STATES.includes(state.user?.enrollment?.state ?? "");
    }
  },
  actions: {
    async login(payload: LoginPayload): Promise<void> {
      const { token } = await loginRequest(payload);
      useFormStore().clear();
      useProjectStore().clear();
      setCookie(AUTH_TOKEN_COOKIE_NAME, token);

      const decoded = decodeJwt<AuthJwtPayload>(token);
      this.user = decoded ? { user_id: decoded.user_id, email: payload.email_prefix } : null;

      // 未驗證帳號可能無法取得完整 profile，但仍可使用表單功能。
      await this.fetchProfile().catch(() => undefined);
    },
    async fetchProfile(): Promise<void> {
      if (!this.user) return;

      const { user_id, campus_id, email, name, role, enrollment } = await getProfile();
      this.user = { user_id, campus_id, email, name, role, enrollment };
      this.profileFetchedAt = Date.now();
    },
    setEnrollment(enrollment: EnrollmentInfo): void {
      if (this.user) this.user = { ...this.user, enrollment };
    },
    logout(): void {
      this.user = null;
      this.profileFetchedAt = 0;
      removeCookie(AUTH_TOKEN_COOKIE_NAME);
      useFormStore().clear();
      useProjectStore().clear();
    }
  }
});
