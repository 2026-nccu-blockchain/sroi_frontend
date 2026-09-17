<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import LoginForm from "@/modules/auth/components/LoginForm.vue";
import { useAuth } from "@/modules/auth/composables/useAuth";
import type { LoginPayload } from "@/modules/auth/types/auth.types";
import { toErrorMessage } from "@/shared/api/error-handler";
import { ApiError } from "@/shared/api/error-handler";

const router = useRouter();
const route = useRoute();
const { login } = useAuth();
const loading = ref(false);
const error = ref("");
const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  "10001": "帳號錯誤",
  "10002": "密碼錯誤",
  "10007": "電子郵件格式錯誤"
};

const handleSubmit = async (payload: LoginPayload): Promise<void> => {
  loading.value = true;
  error.value = "";

  try {
    await login(payload);
    const requestedRedirect = typeof route.query.redirect === "string" ? route.query.redirect : "/";
    const redirect = requestedRedirect.startsWith("/") && !requestedRedirect.startsWith("//")
      ? requestedRedirect
      : "/";
    await router.push(redirect);
  } catch (err) {
    if (err instanceof ApiError && err.statusCode && LOGIN_ERROR_MESSAGES[err.statusCode]) {
      error.value = LOGIN_ERROR_MESSAGES[err.statusCode];
    } else {
      error.value = toErrorMessage(err);
    }
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <LoginForm :loading="loading" :error="error" @submit="handleSubmit" />
</template>
