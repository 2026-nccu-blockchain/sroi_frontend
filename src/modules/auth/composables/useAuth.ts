import { computed, type ComputedRef } from "vue";
import { storeToRefs } from "pinia";

import { useAuthStore } from "@/modules/auth/store/auth.store";
import type { AuthUser, LoginPayload } from "@/modules/auth/types/auth.types";

interface UseAuthResult {
  user: ComputedRef<AuthUser | null>;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
}

export const useAuth = (): UseAuthResult => {
  const authStore = useAuthStore();
  const { user } = storeToRefs(authStore);

  return {
    user: computed(() => user.value),
    login: authStore.login,
    logout: authStore.logout
  };
};
