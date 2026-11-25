<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { resetPassword, sendResetCode, verifyResetCode } from "@/modules/auth/api/auth.api";
import RegisterForm from "@/modules/auth/components/RegisterForm.vue";
import { useAuth } from "@/modules/auth/composables/useAuth";
import type { LoginKind, RegisterStep } from "@/modules/auth/types/auth.types";
import { toAccountIdentifier, toFullEmail } from "@/modules/auth/utils/email";
import { ApiError, toErrorMessage } from "@/shared/api/error-handler";

// 跟後端的 CODE_EXPIRE_MINUTES、CODE_RESEND_SECONDS 一致
const CODE_EXPIRE_MINUTES = 5;
const RESEND_SECONDS = 60;

const RESET_ERROR_MESSAGES: Record<string, string> = {
  "10001": "找不到此帳號，請確認電子郵件與身分（政大師生／非政大師生）是否正確",
  "10007": "電子郵件格式錯誤",
  "10038": "此帳號已超過使用期限，請聯絡管理員延長。",
  "10040": "政大信箱請選擇「政大師生」",
  "10010": "密碼強度不夠",
  "10024": "寄送太頻繁，請稍後再試",
  "10025": "找不到有效的驗證碼，請重新寄送",
  "10026": "驗證碼已過期，請重新寄送",
  "10027": "驗證碼錯誤（錯誤 5 次需重新寄送）",
  "10028": "驗證信寄送失敗，請稍後再試",
  "10029": "此帳號因未在期限內完成在學驗證，已停用。如有疑問請聯絡管理員。",
  "10035": "此帳號已被停權。如有疑問請聯絡管理員。",
  "10037": "驗證已逾時或已使用，請重新驗證電子郵件"
};

const router = useRouter();
const route = useRoute();
const { login } = useAuth();
// 從登入頁的「非政大師生」分頁點忘記密碼會帶 ?type=external
const initialKind: LoginKind = route.query.type === "external" ? "external" : "nccu";

const step = ref<RegisterStep>("email");
const emailPrefix = ref("");
const resetToken = ref("");
const loading = ref(false);
const error = ref("");
const info = ref("");
const resendCooldown = ref(0);
let cooldownTimer: ReturnType<typeof setInterval> | undefined;

const toMessage = (err: unknown): string =>
  err instanceof ApiError && err.statusCode && RESET_ERROR_MESSAGES[err.statusCode]
    ? RESET_ERROR_MESSAGES[err.statusCode]
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
    // prefix 是政大的 @ 前面，或校外人士的完整 email
    await sendResetCode(toAccountIdentifier(prefix));
    emailPrefix.value = prefix;
    info.value = `驗證碼已寄到 ${toFullEmail(prefix)}，${CODE_EXPIRE_MINUTES} 分鐘內有效，請到信箱複製後貼上。`;
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
    const response = await verifyResetCode({ ...toAccountIdentifier(emailPrefix.value), code });
    resetToken.value = response.reset_token;
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
  resetToken.value = "";
  step.value = "email";
};

const handleSubmit = async ({ password }: { name: string; password: string }): Promise<void> => {
  loading.value = true;
  error.value = "";

  try {
    await resetPassword({ reset_token: resetToken.value, new_password: password });
  } catch (err) {
    // reset token 過期或已用過就回到第一步重新驗證
    if (err instanceof ApiError && err.statusCode === "10037") handleChangeEmail();
    error.value = toMessage(err);
    loading.value = false;
    return;
  }

  // 密碼已更新，直接用新密碼登入；登入失敗（例如網路問題）就回登入頁自己登入
  try {
    await login({ ...toAccountIdentifier(emailPrefix.value), password });
    await router.push("/workspace/projects");
  } catch {
    await router.push({ name: "login" });
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <RegisterForm
    mode="reset"
    :initial-kind="initialKind"
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
