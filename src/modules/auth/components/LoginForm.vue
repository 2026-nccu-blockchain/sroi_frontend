<script setup lang="ts">
import { reactive } from "vue";

import type { LoginPayload } from "@/modules/auth/types/auth.types";

const emit = defineEmits<{
  submit: [payload: LoginPayload];
}>();

defineProps<{
  loading?: boolean;
  error?: string;
}>();

const form = reactive<LoginPayload>({
  email: "",
  password: ""
});

const onSubmit = (): void => {
  emit("submit", { ...form });
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
      <input
        v-model="form.email"
        type="email"
        placeholder="name@example.com"
        autocomplete="email"
        required
      />
    </label>

    <label>
      密碼
      <input
        v-model="form.password"
        type="password"
        placeholder="輸入密碼"
        autocomplete="current-password"
        required
      />
    </label>

    <p v-if="error" class="login-form__error" role="alert">{{ error }}</p>

    <button type="submit" :disabled="loading">
      {{ loading ? "登入中..." : "登入" }}
    </button>

    <RouterLink class="login-form__back" to="/">以訪客身分繼續</RouterLink>
  </form>
</template>

<style scoped>
.login-form {
  display: grid;
  gap: 24px;
  width: min(100%, 400px);
}

.login-form__heading {
  display: grid;
  gap: 8px;
  margin-bottom: 8px;
}

.login-form__eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

h1,
p {
  margin: 0;
}

h1 {
  font-size: clamp(36px, 7vw, 52px);
  line-height: 1;
  letter-spacing: -0.04em;
}

.login-form__heading p {
  color: #5f5f5f;
}

label {
  display: grid;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
}

input {
  width: 100%;
  padding: 13px 0;
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

button {
  min-height: 48px;
  padding: 12px 20px;
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
  font-size: 13px;
  text-underline-offset: 4px;
}
</style>
