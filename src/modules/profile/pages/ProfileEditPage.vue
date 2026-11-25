<script setup lang="ts">
import { reactive } from "vue";

import { changePassword } from "@/modules/profile/api/profile.api";
import { PASSWORD_RULE_HINT, isStrongPassword } from "@/modules/profile/constants";
import { ApiError, toErrorMessage } from "@/shared/api/error-handler";

// 註冊後不能改 email（學號就是 email 前綴），這頁只能改密碼
type PasswordField = "oldPassword" | "newPassword" | "confirmPassword";

const PASSWORD_FIELDS: { key: PasswordField; label: string; autocomplete: string }[] = [
  { key: "oldPassword", label: "目前密碼", autocomplete: "current-password" },
  { key: "newPassword", label: "新密碼", autocomplete: "new-password" },
  { key: "confirmPassword", label: "確認新密碼", autocomplete: "new-password" }
];

const PASSWORD_ERROR_MESSAGES: Record<string, string> = {
  "10001": "找不到使用者",
  "10002": "目前密碼錯誤",
  "10010": `密碼強度不足，${PASSWORD_RULE_HINT}`
};

const toMessage = (err: unknown, messages: Record<string, string>): string =>
  err instanceof ApiError && err.statusCode && messages[err.statusCode]
    ? messages[err.statusCode]
    : toErrorMessage(err);

const passwordForm = reactive<Record<PasswordField, string>>({ oldPassword: "", newPassword: "", confirmPassword: "" });
const passwordErrors = reactive<Record<PasswordField, string>>({ oldPassword: "", newPassword: "", confirmPassword: "" });
const passwordState = reactive({ serverError: "", success: "", submitting: false });

const validatePassword = (): boolean => {
  const { oldPassword, newPassword, confirmPassword } = passwordForm;

  passwordErrors.oldPassword = oldPassword ? "" : "請輸入目前密碼";

  if (!newPassword) passwordErrors.newPassword = "請輸入新密碼";
  else if (!isStrongPassword(newPassword)) passwordErrors.newPassword = PASSWORD_RULE_HINT;
  else if (newPassword === oldPassword) passwordErrors.newPassword = "新密碼不可與目前密碼相同";
  else passwordErrors.newPassword = "";

  passwordErrors.confirmPassword = confirmPassword === newPassword ? "" : "密碼與確認密碼不一致";

  return Object.values(passwordErrors).every((message) => !message);
};

const submitPassword = async (): Promise<void> => {
  passwordState.success = "";
  passwordState.serverError = "";
  if (!validatePassword()) return;

  passwordState.submitting = true;
  try {
    await changePassword({ old_password: passwordForm.oldPassword, new_password: passwordForm.newPassword });
    Object.assign(passwordForm, { oldPassword: "", newPassword: "", confirmPassword: "" });
    passwordState.success = "密碼已更新";
  } catch (err) {
    passwordState.serverError = toMessage(err, PASSWORD_ERROR_MESSAGES);
  } finally {
    passwordState.submitting = false;
  }
};
</script>

<template>
  <section class="profile-edit">
    <RouterLink class="back-link" :to="{ name: 'profile' }" aria-label="返回個人資料">
      <span aria-hidden="true">←</span> 返回
    </RouterLink>

    <div>
      <p class="profile-edit__eyebrow">個人資料</p>
      <h1>修改密碼</h1>
    </div>

    <form class="form" novalidate @submit.prevent="submitPassword">
      <label v-for="field in PASSWORD_FIELDS" :key="field.key" class="field">
        <span class="field__label">{{ field.label }} <em>*</em></span>
        <input
          v-model="passwordForm[field.key]"
          type="password"
          :autocomplete="field.autocomplete"
          :class="{ 'field__input--error': passwordErrors[field.key] }"
          @input="passwordErrors[field.key] = ''"
        />
        <span v-if="passwordErrors[field.key]" class="field__error">{{ passwordErrors[field.key] }}</span>
        <span v-else-if="field.key === 'newPassword'" class="field__hint">{{ PASSWORD_RULE_HINT }}</span>
      </label>

      <p v-if="passwordState.serverError" class="form__server-error" role="alert">{{ passwordState.serverError }}</p>
      <p v-if="passwordState.success" class="form__success" role="status">{{ passwordState.success }}</p>

      <div class="form__actions">
        <button class="button button--primary" type="submit" :disabled="passwordState.submitting">
          {{ passwordState.submitting ? "儲存中..." : "更新密碼" }}
        </button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.profile-edit {
  display: grid;
  gap: 22px;
  max-width: 640px;
}

.back-link {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #000;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.back-link span {
  font-size: 18px;
  line-height: 1;
}

.back-link:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.profile-edit__eyebrow {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.15em;
}

h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.04em;
}




.form {
  display: grid;
  gap: 24px;
}

.field {
  display: grid;
  gap: 8px;
}

.field__label {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.field__label em {
  color: #c00;
  font-style: normal;
}

.field input {
  width: 100%;
  border: 1px solid #000;
  border-radius: 0;
  padding: 12px 14px;
  background: #fff;
  color: #000;
  font: inherit;
  font-size: 15px;
  outline: none;
}

.field input:focus {
  box-shadow: inset 0 0 0 1px #000;
}

.field .field__input--error {
  border-color: #c00;
}





.field__hint {
  color: #777;
  font-size: 14px;
}

.field__error,
.form__server-error {
  margin: 0;
  color: #c00;
  font-size: 14px;
}

.form__success {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

.form__actions {
  display: flex;
  justify-content: flex-end;
}

.button {
  min-height: 46px;
  padding: 10px 18px;
  border: 1px solid #000;
  background: #fff;
  color: #000;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.button--primary {
  background: #000;
  color: #fff;
}

.button--primary:hover:not(:disabled) {
  background: #fff;
  color: #000;
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
