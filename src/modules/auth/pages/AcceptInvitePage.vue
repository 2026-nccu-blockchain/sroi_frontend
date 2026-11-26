<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { acceptExternalInvitation, getExternalInvitation } from "@/modules/auth/api/auth.api";
import { useAuth } from "@/modules/auth/composables/useAuth";
import type { ExternalInvitationInfo } from "@/modules/auth/types/auth.types";
import { PASSWORD_RULE_HINT, isStrongPassword } from "@/modules/profile/constants";
import { ApiError, toErrorMessage } from "@/shared/api/error-handler";

const INVITE_ERROR_MESSAGES: Record<string, string> = {
  "10006": "此電子郵件已經建立過帳號，請直接登入",
  "10010": "密碼強度不夠",
  "10035": "此帳號已被停權。如有疑問請聯絡管理員。",
  "10039": "邀請連結已失效（超過 7 天、已使用，或已被重新寄送），請聯絡管理員重新寄送邀請。"
};

const route = useRoute();
const router = useRouter();
const { login, logout } = useAuth();

const token = typeof route.query.token === "string" ? route.query.token : "";
const invitation = ref<ExternalInvitationInfo | null>(null);
const loading = ref(true);
const pageError = ref("");

const form = reactive({ name: "", password: "", confirmPassword: "" });
const showPassword = ref(false);
const submitting = ref(false);
const error = ref("");

const passwordMismatch = computed(() => form.confirmPassword.length > 0 && form.confirmPassword !== form.password);

const toMessage = (err: unknown): string =>
  err instanceof ApiError && err.statusCode && INVITE_ERROR_MESSAGES[err.statusCode]
    ? INVITE_ERROR_MESSAGES[err.statusCode]
    : toErrorMessage(err);

onMounted(async () => {
  if (!token) {
    pageError.value = INVITE_ERROR_MESSAGES["10039"];
    loading.value = false;
    return;
  }
  try {
    invitation.value = (await getExternalInvitation(token)).invitation;
  } catch (err) {
    pageError.value = toMessage(err);
  } finally {
    loading.value = false;
  }
});

const handleSubmit = async (): Promise<void> => {
  if (!invitation.value || passwordMismatch.value) return;
  if (!form.name.trim()) {
    error.value = "請輸入姓名";
    return;
  }
  if (!isStrongPassword(form.password)) {
    error.value = `密碼強度不足，${PASSWORD_RULE_HINT}`;
    return;
  }

  submitting.value = true;
  error.value = "";
  const email = invitation.value.email;
  try {
    await acceptExternalInvitation({ token, name: form.name.trim(), password: form.password });
  } catch (err) {
    error.value = toMessage(err);
    submitting.value = false;
    return;
  }

  // 帳號建立完成，直接用新帳號登入（如果瀏覽器原本登入別的帳號，先登出）
  try {
    logout();
    await login({ email, password: form.password });
    await router.push("/workspace/projects");
  } catch {
    await router.push({ name: "login" });
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div class="invite">
    <div class="invite__heading">
      <span class="invite__eyebrow">SROI</span>
      <h1>設定帳號</h1>
    </div>

    <p v-if="loading">載入中...</p>
    <template v-else-if="pageError">
      <p class="invite__error" role="alert">{{ pageError }}</p>
      <RouterLink class="invite__back" :to="{ name: 'login' }">前往登入</RouterLink>
    </template>

    <form v-else-if="invitation" class="invite__body" @submit.prevent="handleSubmit">
      <dl class="invite__info">
        <div>
          <dt>帳號</dt>
          <dd>{{ invitation.email }}</dd>
        </div>
        <div>
          <dt>所屬單位</dt>
          <dd>{{ invitation.organization }}</dd>
        </div>
        <div>
          <dt>使用期限</dt>
          <dd>完成設定後 {{ invitation.valid_years }} 年</dd>
        </div>
      </dl>

      <label>
        姓名
        <input v-model="form.name" type="text" maxlength="20" placeholder="請輸入本名" autocomplete="name" required />
      </label>

      <label>
        密碼 (長度至少8碼、需要有大小寫字母及數字)
        <div class="invite__password">
          <input
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="輸入密碼"
            autocomplete="new-password"
            required
            @input="error = ''"
          />
          <button type="button" class="invite__toggle" @click="showPassword = !showPassword">
            {{ showPassword ? "隱藏" : "顯示" }}
          </button>
        </div>
      </label>

      <label>
        確認密碼
        <input
          v-model="form.confirmPassword"
          :type="showPassword ? 'text' : 'password'"
          placeholder="再次輸入密碼"
          autocomplete="new-password"
          required
        />
        <p v-if="passwordMismatch" class="invite__field-error">密碼與確認密碼不一致</p>
      </label>

      <p v-if="error" class="invite__error" role="alert">{{ error }}</p>

      <button class="invite__submit" type="submit" :disabled="submitting || passwordMismatch">
        {{ submitting ? "註冊中..." : "完成註冊" }}
      </button>
      <p class="invite__hint">之後請在登入頁選擇「非政大師生」，以完整的電子郵件登入。</p>
    </form>
  </div>
</template>

<style scoped>
.invite {
  display: grid;
  gap: 16px;
  width: min(100%, 400px);
}

.invite__heading {
  display: grid;
  gap: 4px;
  margin-bottom: 4px;
}

.invite__eyebrow {
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

.invite__body {
  display: grid;
  gap: 16px;
}

.invite__info {
  display: grid;
  gap: 0;
  margin: 0;
  border-top: 2px solid #000;
}

.invite__info div {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr);
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #000;
  font-size: 14px;
}

.invite__info dt {
  color: #777;
}

.invite__info dd {
  margin: 0;
  font-weight: 700;
  overflow-wrap: anywhere;
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

.invite__password {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #000;
}

.invite__password:focus-within {
  border-bottom-width: 2px;
}

.invite__password input {
  flex: 1;
  min-width: 0;
  border-bottom: 0;
}

.invite__toggle {
  border: 0;
  padding: 0 0 0 12px;
  background: transparent;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.invite__submit {
  min-height: 30px;
  padding: 10px 20px;
  border: 1px solid #000;
  background: #000;
  color: #fff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.invite__submit:hover:not(:disabled) {
  background: #fff;
  color: #000;
}

.invite__submit:disabled {
  cursor: wait;
  opacity: 0.55;
}

.invite__error {
  padding: 14px;
  border: 2px solid #ff0000;
  font-size: 14px;
  color: #ff0000;
}

.invite__field-error {
  font-size: 14px;
  font-weight: 400;
  color: #ff0000;
}

.invite__hint {
  color: #5f5f5f;
  font-size: 13px;
  line-height: 1.6;
}

.invite__back {
  justify-self: center;
  color: #000;
  font-size: 14px;
  text-underline-offset: 4px;
}
</style>
