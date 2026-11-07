<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import RegisterForm from "@/modules/auth/components/RegisterForm.vue";
import type { RegisterStep } from "@/modules/auth/types/auth.types";
import { toErrorMessage } from "@/shared/api/error-handler";
import { ApiError } from "@/shared/api/error-handler";
import { register, sendCode, verifyCode } from "@/modules/auth/api/auth.api";
import { useAuth } from "@/modules/auth/composables/useAuth";
import { EMAIL_DOMAIN } from "@/modules/auth/utils/email";

// 跟後端的 CODE_EXPIRE_MINUTES、CODE_RESEND_SECONDS 一致
const CODE_EXPIRE_MINUTES = 5;
const RESEND_SECONDS = 60;

const router = useRouter();
const route = useRoute();
const { login } = useAuth();

const step = ref<RegisterStep>("email");
const emailPrefix = ref("");
const registerToken = ref("");
const loading = ref(false);
const error = ref("");
const info = ref("");
const resendCooldown = ref(0);
let cooldownTimer: ReturnType<typeof setInterval> | undefined;

const REGISTER_ERROR_MESSAGES: Record<string, string> = {
  "10005": "驗證已逾時，請重新驗證電子郵件",
  "10006": "電子郵件已註冊",
  "10007": "電子郵件格式錯誤",
  "10010": "密碼強度不夠",
  "10024": "寄送太頻繁，請稍後再試",
  "10025": "找不到有效的驗證碼，請重新寄送",
  "10026": "驗證碼已過期，請重新寄送",
  "10027": "驗證碼錯誤（錯誤 5 次需重新寄送）",
  "10028": "驗證信寄送失敗，請稍後再試"
};

const toMessage = (err: unknown): string =>
  err instanceof ApiError && err.statusCode && REGISTER_ERROR_MESSAGES[err.statusCode]
    ? REGISTER_ERROR_MESSAGES[err.statusCode]
    : toErrorMessage(err);

const startCooldown = (): void => {
  clearInterval(cooldownTimer);
  resendCooldown.value = RESEND_SECONDS;
  cooldownTimer = setInterval(() => {
    resendCooldown.value -= 1;
    if (resendCooldown.value <= 0) clearInterval(cooldownTimer);
  }, 1000);
};

onBeforeUnmount(() => clearInterval(cooldownTimer));

const handleSendCode = async (prefix: string): Promise<void> => {
  loading.value = true;
  error.value = "";

  try {
    await sendCode({ email_prefix: prefix });
    emailPrefix.value = prefix;
    info.value = `驗證碼已寄到 ${prefix}${EMAIL_DOMAIN}，${CODE_EXPIRE_MINUTES} 分鐘內有效，請到信箱複製後貼上。`;
    step.value = "code";
    startCooldown();
  } catch (err) {
    error.value = toMessage(err);
  } finally {
    loading.value = false;
  }
};

const handleVerifyCode = async (code: string): Promise<void> => {
  loading.value = true;
  error.value = "";

  try {
    const response = await verifyCode({ email_prefix: emailPrefix.value, code });
    registerToken.value = response.register_token;
    step.value = "profile";
  } catch (err) {
    error.value = toMessage(err);
  } finally {
    loading.value = false;
  }
};

const handleChangeEmail = (): void => {
  error.value = "";
  info.value = "";
  registerToken.value = "";
  step.value = "email";
};

const handleSubmit = async (payload: { name: string; password: string }): Promise<void> => {
  loading.value = true;
  error.value = "";

  try {
    await register({ register_token: registerToken.value, ...payload });
    // 註冊完直接登入，不用再輸入一次
    await login({ email_prefix: emailPrefix.value, password: payload.password });
    const requestedRedirect = typeof route.query.redirect === "string" ? route.query.redirect : "/workspace/projects";
    const redirect = requestedRedirect.startsWith("/") && !requestedRedirect.startsWith("//")
      ? requestedRedirect
      : "/";
    await router.push(redirect);
  } catch (err) {
    // register token 過期就回到第一步重新驗證
    if (err instanceof ApiError && err.statusCode === "10005") handleChangeEmail();
    error.value = toMessage(err);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <RegisterForm
    :step="step"
    :email-prefix="emailPrefix"
    :loading="loading"
    :error="error"
    :info="info"
    :resend-cooldown="resendCooldown"
    @send-code="handleSendCode"
    @verify-code="handleVerifyCode"
    @change-email="handleChangeEmail"
    @submit="handleSubmit"
  />
</template>
