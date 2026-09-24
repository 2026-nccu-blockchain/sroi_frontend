<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import RegisterForm from "@/modules/auth/components/RegisterForm.vue";
import type { RegisterPayload } from "@/modules/auth/types/auth.types";
import { toErrorMessage } from "@/shared/api/error-handler";
import { ApiError } from "@/shared/api/error-handler";
import { register } from "@/modules/auth/api/auth.api";

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const error = ref("");
const REGISTER_ERROR_MESSAGES: Record<string, string> = {
  "10006": "電子郵件已註冊",
  "10007": "電子郵件格式錯誤",
  "10010": "密碼強度不夠",
};

const handleSubmit = async (payload: RegisterPayload): Promise<void> => {
  loading.value = true;
  error.value = "";

  try {
    await register(payload)
    const requestedRedirect = typeof route.query.redirect === "string" ? route.query.redirect : "/";
    const redirect = requestedRedirect.startsWith("/") && !requestedRedirect.startsWith("//")
      ? requestedRedirect
      : "/";
    await router.push(redirect);
  } catch (err) {
    if (err instanceof ApiError && err.statusCode && REGISTER_ERROR_MESSAGES[err.statusCode]) {
      error.value = REGISTER_ERROR_MESSAGES[err.statusCode];
    } else {
      error.value = toErrorMessage(err);
    }
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <RegisterForm :loading="loading" :error="error" @submit="handleSubmit" />
</template>
