<script setup lang="ts">
import { reactive, ref } from "vue";

import type { LoginPayload } from "@/modules/auth/types/auth.types";
import { EMAIL_DOMAIN, normalizeEmailPrefix } from "@/modules/auth/utils/email";

const emit = defineEmits<{
  submit: [payload: LoginPayload];
}>();

const props = defineProps<{
  loading?: boolean;
  error?: string;
}>();

const form = reactive({
  emailPrefix: "",
  password: ""
});

const showPassword = ref(false);
const formatError = ref("");

const onSubmit = (): void => {
  const emailPrefix = normalizeEmailPrefix(form.emailPrefix);
  if (!emailPrefix) {
    formatError.value = "請輸入 @ 前面的帳號，只能包含英數字與 . _ % + -";
    return;
  }
  formatError.value = "";
  emit("submit", { email_prefix: emailPrefix, password: form.password });
};
</script>

<template>
  <form class="login-form" @submit.prevent="onSubmit">
    <div class="login-form__heading">
      <span class="login-form__eyebrow">SROI</span>
      <h1>登入</h1>
    </div>

    <label>
      電子郵件
      <div class="login-form__email">
        <input
          v-model="form.emailPrefix"
          type="text"
          placeholder="帳號"
          autocomplete="username"
          autocapitalize="off"
          spellcheck="false"
          required
          @input="formatError = ''"
        />
        <span class="login-form__domain">{{ EMAIL_DOMAIN }}</span>
      </div>
    </label>

    <label>
      密碼
      <div class="login-form__password">
        <input
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          placeholder="輸入密碼"
          autocomplete="current-password"
          required
        />
        <button
          type="button"
          class="login-form__password-toggle"
          :aria-label="showPassword ? '隱藏密碼' : '顯示密碼'"
          @click="showPassword = !showPassword"
        >
          {{ showPassword ? "隱藏" : "顯示" }}
        </button>
      </div>
    </label>

    <p v-if="formatError || props.error" class="login-form__error" role="alert">{{ formatError || props.error }}</p>

    <button type="submit" :disabled="loading">
      {{ loading ? "登入中..." : "登入" }}
    </button>

    <RouterLink class="login-form__back" :to="{ name: 'register' }">還沒有帳號？前往註冊</RouterLink>
  </form>
</template>

<style scoped>
.login-form {
  display: grid;
  gap: 16px;
  width: min(100%, 400px);
}

.login-form__heading {
  display: grid;
  gap: 4px;
  margin-bottom: 4px;
}

.login-form__eyebrow {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

h1,
p {
  margin: 0;
}

h1 {
  font-size: 26px;
  line-height: 1;
  letter-spacing: -0.04em;
}

.login-form__heading p {
  color: #5f5f5f;
}

label {
  display: grid;
  gap: 4px;
  font-size: 14px;
  font-weight: 700;
}

input {
  width: 100%;
  padding: 10px 0;
  border: 0;
  border-bottom: 1px solid #000;
  border-radius: 0;
  background: transparent;
  color: #000;
  font: inherit;
  outline: none;
}

input:focus {
  border-bottom-width: 2px;
}

.login-form__password,
.login-form__email {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #000;
}

.login-form__password:focus-within,
.login-form__email:focus-within {
  border-bottom-width: 2px;
}

.login-form__password input,
.login-form__email input {
  border-bottom: 0;
  flex: 1;
  min-width: 0;
}

.login-form__domain {
  padding-left: 8px;
  font-weight: 400;
  white-space: nowrap;
}

.login-form__password-toggle {
  border: 0;
  padding: 0 0 0 12px;
  background: transparent;
  color: #000;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
}

.login-form__password-toggle:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}

button {
  min-height: 30px;
  padding: 10px 20px;
  border: 1px solid #000;
  background: #000;
  color: #fff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

button:hover:not(:disabled) {
  background: #fff;
  color: #000;
}

button:disabled {
  cursor: wait;
  opacity: 0.55;
}

.login-form__error {
  padding: 14px;
  border: 2px solid #ff0000;
  font-size: 14px;
  color: #ff0000;
}

.login-form__back {
  justify-self: center;
  color: #000;
  font-size: 14px;
  text-underline-offset: 4px;
}
</style>
