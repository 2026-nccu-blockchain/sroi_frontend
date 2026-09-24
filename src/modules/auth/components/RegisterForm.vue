<script setup lang="ts">
import { computed, reactive, ref } from "vue";

import type { RegisterPayload } from "@/modules/auth/types/auth.types";

const emit = defineEmits<{
  submit: [payload: RegisterPayload];
}>();

defineProps<{
  loading?: boolean;
  error?: string;
}>();

const form = reactive<RegisterPayload>({
  email: "",
  password: "",
  name: ""
});

const confirmPassword = ref("");
const showPassword = ref(false);
const showConfirmPassword = ref(false);

const passwordMismatch = computed(
  () => confirmPassword.value.length > 0 && confirmPassword.value !== form.password
);

const onSubmit = (): void => {
  if (passwordMismatch.value) return;
  emit("submit", { ...form });
};
</script>

<template>
  <form class="register-form" @submit.prevent="onSubmit">
    <div class="register-form__heading">
      <span class="register-form__eyebrow">SROI</span>
      <h1>註冊</h1>
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
      姓名
      <input
        v-model="form.name"
        type="name"
        placeholder="請輸入本名"
        autocomplete="name"
        required
      />
    </label>

    <label>
      密碼 (長度至少8碼、需要有大小寫字母及數字)
      <div class="register-form__password">
        <input
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          placeholder="輸入密碼"
          autocomplete="new-password"
          required
        />
        <button
          type="button"
          class="register-form__password-toggle"
          :aria-label="showPassword ? '隱藏密碼' : '顯示密碼'"
          @click="showPassword = !showPassword"
        >
          {{ showPassword ? "隱藏" : "顯示" }}
        </button>
      </div>
    </label>

    <label>
      確認密碼
      <div class="register-form__password">
        <input
          v-model="confirmPassword"
          :type="showConfirmPassword ? 'text' : 'password'"
          placeholder="再次輸入密碼"
          autocomplete="new-password"
          required
        />
        <button
          type="button"
          class="register-form__password-toggle"
          :aria-label="showConfirmPassword ? '隱藏密碼' : '顯示密碼'"
          @click="showConfirmPassword = !showConfirmPassword"
        >
          {{ showConfirmPassword ? "隱藏" : "顯示" }}
        </button>
      </div>
      <p v-if="passwordMismatch" class="register-form__field-error">密碼與確認密碼不一致</p>
    </label>

    <p v-if="error" class="register-form__error" role="alert">{{ error }}</p>

    <button type="submit" :disabled="loading || passwordMismatch">
      {{ loading ? "註冊中..." : "註冊" }}
    </button>

    <RouterLink class="register-form__back" to="/">以訪客身分繼續</RouterLink>
  </form>
</template>

<style scoped>
.register-form {
  display: grid;
  gap: 16px;
  width: min(100%, 400px);
}

.register-form__heading {
  display: grid;
  gap: 4px;
  margin-bottom: 4px;
}

.register-form__eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

h1,
p {
  margin: 0;
}

h1 {
  font-size: clamp(28px, 5vw, 40px);
  line-height: 1;
  letter-spacing: -0.04em;
}

.register-form__heading p {
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
  padding: 5px 0;
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

.register-form__password {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #000;
}

.register-form__password:focus-within {
  border-bottom-width: 2px;
}

.register-form__password input {
  border-bottom: 0;
  flex: 1;
}

.register-form__password-toggle {
  border: 0;
  padding: 0 0 0 12px;
  background: transparent;
  color: #000;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
}

.register-form__password-toggle:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.register-form__field-error {
  margin: 0;
  font-size: 12px;
  font-weight: 400;
  color: #ff0000;
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

.register-form__error {
  padding: 14px;
  border: 2px solid #ff0000;
  font-size: 14px;
  color: #ff0000;
}

.register-form__back {
  justify-self: center;
  color: #000;
  font-size: 13px;
  text-underline-offset: 4px;
}
</style>
