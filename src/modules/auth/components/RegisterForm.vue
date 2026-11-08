<script setup lang="ts">
import { computed, reactive, ref } from "vue";

import { EMAIL_DOMAIN, normalizeEmailPrefix } from "@/modules/auth/utils/email";
import type { RegisterStep } from "@/modules/auth/types/auth.types";
import { PASSWORD_RULE_HINT, isStrongPassword } from "@/modules/profile/constants";

const props = defineProps<{
  step: RegisterStep;
  emailPrefix: string;
  loading?: boolean;
  error?: string;
  info?: string;
  // 距離可以重寄驗證碼還剩幾秒
  resendCooldown?: number;
}>();

const emit = defineEmits<{
  "send-code": [emailPrefix: string];
  "verify-code": [code: string];
  "change-email": [];
  submit: [payload: { name: string; password: string }];
}>();

const emailInput = ref(props.emailPrefix);
const code = ref("");
const form = reactive({
  name: "",
  password: ""
});

const confirmPassword = ref("");
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const localError = ref("");

const passwordMismatch = computed(
  () => confirmPassword.value.length > 0 && confirmPassword.value !== form.password
);
const fullEmail = computed(() => props.emailPrefix + EMAIL_DOMAIN);
const errorMessage = computed(() => localError.value || props.error);

const onSendCode = (): void => {
  const emailPrefix = normalizeEmailPrefix(emailInput.value);
  if (!emailPrefix) {
    localError.value = "請輸入 @ 前面的帳號，只能包含英數字與 . _ % + -";
    return;
  }
  localError.value = "";
  emit("send-code", emailPrefix);
};

const onVerifyCode = (): void => {
  const value = code.value.trim().toUpperCase();
  if (value.length !== 8) {
    localError.value = "驗證碼為 8 碼英數字";
    return;
  }
  localError.value = "";
  emit("verify-code", value);
};

const onResend = (): void => {
  code.value = "";
  localError.value = "";
  emit("send-code", props.emailPrefix);
};

const onChangeEmail = (): void => {
  code.value = "";
  localError.value = "";
  emit("change-email");
};

const onSubmit = (): void => {
  if (passwordMismatch.value) return;
  if (!isStrongPassword(form.password)) {
    localError.value = `密碼強度不足，${PASSWORD_RULE_HINT}`;
    return;
  }
  localError.value = "";
  emit("submit", { name: form.name.trim(), password: form.password });
};
</script>

<template>
  <div class="register-form">
    <div class="register-form__heading">
      <span class="register-form__eyebrow">SROI</span>
      <h1>註冊</h1>
      <ol class="register-form__steps" aria-label="註冊步驟">
        <li :class="{ 'register-form__step--active': step === 'email' }">1 驗證信箱</li>
        <li :class="{ 'register-form__step--active': step === 'code' }">2 輸入驗證碼</li>
        <li :class="{ 'register-form__step--active': step === 'profile' }">3 填寫資料</li>
      </ol>
    </div>

    <form v-if="step === 'email'" class="register-form__body" @submit.prevent="onSendCode">
      <label>
        電子郵件
        <div class="register-form__email">
          <input
            v-model="emailInput"
            type="text"
            placeholder="帳號"
            autocomplete="username"
            autocapitalize="off"
            spellcheck="false"
            required
            @input="localError = ''"
          />
          <span class="register-form__domain">{{ EMAIL_DOMAIN }}</span>
        </div>
      </label>

      <p v-if="errorMessage" class="register-form__error" role="alert">{{ errorMessage }}</p>

      <button type="submit" :disabled="loading">
        {{ loading ? "寄送中..." : "寄送驗證碼" }}
      </button>
    </form>

    <form v-else-if="step === 'code'" class="register-form__body" @submit.prevent="onVerifyCode">
      <p v-if="info" class="register-form__info" role="status">{{ info }}</p>

      <label>
        驗證碼
        <input
          v-model="code"
          class="register-form__code"
          type="text"
          inputmode="text"
          maxlength="8"
          placeholder="8 碼英數字"
          autocomplete="one-time-code"
          autocapitalize="characters"
          spellcheck="false"
          required
          @input="localError = ''"
        />
      </label>

      <p v-if="errorMessage" class="register-form__error" role="alert">{{ errorMessage }}</p>

      <button type="submit" :disabled="loading">
        {{ loading ? "驗證中..." : "驗證" }}
      </button>

      <div class="register-form__links">
        <button
          type="button"
          class="register-form__link"
          :disabled="loading || (resendCooldown ?? 0) > 0"
          @click="onResend"
        >
          {{ (resendCooldown ?? 0) > 0 ? `${resendCooldown} 秒後可重新寄送` : "重新寄送驗證碼" }}
        </button>
        <button type="button" class="register-form__link" :disabled="loading" @click="onChangeEmail">
          更換電子郵件
        </button>
      </div>
    </form>

    <form v-else class="register-form__body" @submit.prevent="onSubmit">
      <p class="register-form__info" role="status">已驗證：{{ fullEmail }}</p>

      <label>
        姓名
        <input
          v-model="form.name"
          type="text"
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
            @input="localError = ''"
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

      <p v-if="errorMessage" class="register-form__error" role="alert">{{ errorMessage }}</p>

      <button type="submit" :disabled="loading || passwordMismatch">
        {{ loading ? "註冊中..." : "註冊" }}
      </button>
    </form>

    <RouterLink class="register-form__back" :to="{ name: 'login' }">已有帳號？前往登入</RouterLink>
  </div>
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

.register-form__body {
  display: grid;
  gap: 16px;
}

.register-form__steps {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  color: #8a8a8a;
  font-size: 14px;
}

.register-form__step--active {
  color: #000;
  font-weight: 700;
}

.register-form__info {
  font-size: 14px;
  line-height: 1.6;
  color: #5f5f5f;
}

label {
  display: grid;
  gap: 8px;
  font-size: 14px;
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

.register-form__password,
.register-form__email {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #000;
}

.register-form__password:focus-within,
.register-form__email:focus-within {
  border-bottom-width: 2px;
}

.register-form__password input,
.register-form__email input {
  border-bottom: 0;
  flex: 1;
  min-width: 0;
}

.register-form__domain {
  padding-left: 8px;
  font-weight: 400;
  white-space: nowrap;
}

.register-form__code {
  font-family: "Courier New", monospace;
  font-size: 18px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
}

.register-form__links {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
}

.register-form .register-form__link {
  min-height: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: #000;
  font-size: 14px;
  font-weight: 400;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.register-form .register-form__link:hover:not(:disabled) {
  background: transparent;
}

.register-form .register-form__link:disabled {
  cursor: not-allowed;
  text-decoration: none;
}

.register-form__password-toggle {
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

.register-form__password-toggle:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.register-form__field-error {
  margin: 0;
  font-size: 14px;
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
  font-size: 14px;
  text-underline-offset: 4px;
}
</style>
