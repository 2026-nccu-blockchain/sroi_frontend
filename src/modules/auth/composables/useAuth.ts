import { computed, type ComputedRef } from "vue";
import { storeToRefs } from "pinia";

import { useAuthStore } from "@/modules/auth/store/auth.store";
import type { AuthUser, LoginPayload } from "@/modules/auth/types/auth.types";

interface UseAuthResult {
  user: ComputedRef<AuthUser | null>;
  isAuthenticated: ComputedRef<boolean>;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
}

export const useAuth = (): UseAuthResult => {
  const authStore = useAuthStore();
  const { user } = storeToRefs(authStore);

  return {
    user: computed(() => user.value),
    isAuthenticated: computed(() => user.value !== null),
    login: authStore.login,
    logout: authStore.logout
  };
};
