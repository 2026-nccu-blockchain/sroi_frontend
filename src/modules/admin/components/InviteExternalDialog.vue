<script setup lang="ts">
import { reactive, ref } from "vue";

import { inviteExternal } from "@/modules/admin/api/admin.api";
import { toAdminErrorMessage } from "@/modules/admin/constants";
import { normalizeExternalEmail } from "@/modules/auth/utils/email";
import { EMAIL_DOMAIN } from "@/modules/auth/utils/email";
import BaseModal from "@/shared/components/BaseModal.vue";

// 校外人士帳號：送出後寄邀請信（連結 7 天），對方設定姓名與密碼才建立帳號
const YEAR_OPTIONS = [1, 2, 3, 4];

const emit = defineEmits<{ close: []; invited: [email: string] }>();

const form = reactive({ email: "", organization: "", validYears: 1 });
const errors = reactive({ email: "", organization: "" });
const submitting = ref(false);
const serverError = ref("");

const handleSubmit = async (): Promise<void> => {
  const email = normalizeExternalEmail(form.email);
  errors.email = email
    ? ""
    : form.email.trim().toLowerCase().endsWith(EMAIL_DOMAIN)
      ? "政大師生請用政大信箱自行註冊，不需要邀請"
      : "請輸入完整的電子郵件，例如 name@example.com";
  errors.organization = form.organization.trim() ? "" : "請輸入所屬單位";
  if (!email || errors.organization) return;

  submitting.value = true;
  serverError.value = "";
  try {
    await inviteExternal({ email, organization: form.organization.trim(), valid_years: form.validYears });
    emit("invited", email);
  } catch (err) {
    serverError.value = toAdminErrorMessage(err);
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <BaseModal :open="true">
    <form class="invite" role="dialog" aria-modal="true" aria-label="新增校外使用者" @submit.prevent="handleSubmit">
      <div class="invite__header">
        <h2>新增使用者（校外人士）</h2>
        <button class="invite__close" type="button" aria-label="關閉" @click="emit('close')">✕</button>
      </div>

      <p class="muted">送出後會寄邀請信到這個 email，對方點信中連結（7 天內有效）設定姓名與密碼後，帳號才會建立。</p>

      <label class="field">
        <span>電子郵件（帳號）</span>
        <input v-model="form.email" type="email" placeholder="name@example.com" autocapitalize="off" spellcheck="false" @input="errors.email = ''" />
        <small v-if="errors.email" class="field__error">{{ errors.email }}</small>
      </label>

      <label class="field">
        <span>所屬單位</span>
        <input v-model="form.organization" type="text" maxlength="255" placeholder="例如：○○基金會" @input="errors.organization = ''" />
        <small v-if="errors.organization" class="field__error">{{ errors.organization }}</small>
      </label>

      <label class="field">
        <span>帳號使用期限</span>
        <select v-model.number="form.validYears">
          <option v-for="years in YEAR_OPTIONS" :key="years" :value="years">{{ years }} 年</option>
        </select>
        <small class="muted">從對方完成設定密碼那天開始計算，到期後無法登入，可以在使用者詳細頁延長。</small>
      </label>

      <p v-if="serverError" class="invite__error" role="alert">{{ serverError }}</p>

      <div class="invite__actions">
        <button class="button" type="button" :disabled="submitting" @click="emit('close')">取消</button>
        <button class="button button--primary" type="submit" :disabled="submitting">
          {{ submitting ? "寄送中..." : "送出邀請" }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<style scoped>
.invite {
  display: grid;
  gap: 16px;
  width: min(480px, calc(100vw - 72px));
}

.invite__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.invite__close {
  border: 0;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
}

.field {
  display: grid;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
}

.field input,
.field select {
  border: 1px solid #000;
  padding: 10px 12px;
  background: #fff;
  font: inherit;
  font-size: 15px;
  font-weight: 400;
  outline: none;
}

.field input:focus,
.field select:focus {
  box-shadow: inset 0 0 0 1px #000;
}

.field__error,
.invite__error {
  margin: 0;
  color: #c00;
  font-size: 13px;
  font-weight: 400;
}

.invite__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.button {
  min-height: 38px;
  padding: 8px 18px;
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

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.muted {
  margin: 0;
  color: #777;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.6;
}
</style>
