<script setup lang="ts">
import { computed, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useAuthStore } from "@/modules/auth/store/auth.store";
import { changeEmail, changePassword } from "@/modules/profile/api/profile.api";
import { PASSWORD_RULE_HINT, isStrongPassword } from "@/modules/profile/constants";
import { ApiError, toErrorMessage } from "@/shared/api/error-handler";

type Tab = "account" | "password";
type PasswordField = "oldPassword" | "newPassword" | "confirmPassword";

const TABS: { key: Tab; label: string }[] = [
  { key: "account", label: "帳號" },
  { key: "password", label: "密碼" }
];

const PASSWORD_FIELDS: { key: PasswordField; label: string; autocomplete: string }[] = [
  { key: "oldPassword", label: "目前密碼", autocomplete: "current-password" },
  { key: "newPassword", label: "新密碼", autocomplete: "new-password" },
  { key: "confirmPassword", label: "確認新密碼", autocomplete: "new-password" }
];

const EMAIL_ERROR_MESSAGES: Record<string, string> = {
  "10001": "找不到使用者",
  "10006": "此 Email 已被其他帳號使用",
  "10007": "Email 格式錯誤"
};

const PASSWORD_ERROR_MESSAGES: Record<string, string> = {
  "10001": "找不到使用者",
  "10002": "目前密碼錯誤",
  "10010": `密碼強度不足，${PASSWORD_RULE_HINT}`
};

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// 分頁記在 query，重新整理後仍停在同一頁
const activeTab = computed<Tab>(() => (route.query.tab === "password" ? "password" : "account"));
const switchTab = (tab: Tab): void => {
  router.replace({ query: { tab } });
};

const toMessage = (err: unknown, messages: Record<string, string>): string =>
  err instanceof ApiError && err.statusCode && messages[err.statusCode]
    ? messages[err.statusCode]
    : toErrorMessage(err);

const account = reactive({
  email: authStore.user?.email ?? "",
  error: "",
  serverError: "",
  success: "",
  submitting: false
});

const submitEmail = async (): Promise<void> => {
  const email = account.email.trim();
  account.success = "";
  account.serverError = "";

  if (!email) account.error = "請輸入 Email";
  else if (email === authStore.user?.email) account.error = "新 Email 與目前相同";
  else account.error = "";
  if (account.error) return;

  account.submitting = true;
  try {
    await changeEmail({ email });
    await authStore.fetchProfile();
    account.success = "Email 已更新";
  } catch (err) {
    account.serverError = toMessage(err, EMAIL_ERROR_MESSAGES);
  } finally {
    account.submitting = false;
  }
};

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
      <h1>修改資料</h1>
    </div>

    <div class="tabs" role="tablist">
      <button
        v-for="tab in TABS"
        :key="tab.key"
        type="button"
        role="tab"
        class="tabs__item"
        :class="{ 'tabs__item--active': activeTab === tab.key }"
        :aria-selected="activeTab === tab.key"
        @click="switchTab(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <form v-if="activeTab === 'account'" class="form" novalidate @submit.prevent="submitEmail">
      <label class="field">
        <span class="field__label">Email <em>*</em></span>
        <input
          v-model="account.email"
          type="email"
          autocomplete="email"
          :class="{ 'field__input--error': account.error }"
          @input="account.error = ''"
        />
        <span v-if="account.error" class="field__error">{{ account.error }}</span>
      </label>

      <p v-if="account.serverError" class="form__server-error" role="alert">{{ account.serverError }}</p>
      <p v-if="account.success" class="form__success" role="status">{{ account.success }}</p>

      <div class="form__actions">
        <button class="button button--primary" type="submit" :disabled="account.submitting">
          {{ account.submitting ? "儲存中..." : "儲存" }}
        </button>
      </div>
    </form>

    <form v-else class="form" novalidate @submit.prevent="submitPassword">
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
  margin-top: -16px;
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
  font-size: 22px;
  line-height: 1;
}

.back-link:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.profile-edit__eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.15em;
}

h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.04em;
}

.tabs {
  display: flex;
  border-bottom: 2px solid #000;
}

.tabs__item {
  min-width: 96px;
  padding: 12px 18px;
  border: 0;
  background: #fff;
  color: #777;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.tabs__item--active {
  background: #000;
  color: #fff;
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
  font-size: 12px;
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
  font-size: 12px;
}

.field__error,
.form__server-error {
  margin: 0;
  color: #c00;
  font-size: 12px;
}

.form__success {
  margin: 0;
  font-size: 13px;
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
  font-size: 13px;
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
