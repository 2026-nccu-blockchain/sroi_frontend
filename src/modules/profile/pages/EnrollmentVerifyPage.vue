<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { getEnrollment, uploadEnrollmentProof } from "@/modules/auth/api/auth.api";
import { useAuth } from "@/modules/auth/composables/useAuth";
import { useAuthStore } from "@/modules/auth/store/auth.store";
import type { EnrollmentInfo } from "@/modules/auth/types/auth.types";
import { ApiError, toErrorMessage } from "@/shared/api/error-handler";
import { formatTaipeiDate } from "@/shared/utils/date";
import { formatFileSize } from "@/shared/utils/format";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

const ENROLLMENT_ERROR_MESSAGES: Record<string, string> = {
  "10031": "目前不在在學驗證期間，不需要上傳",
  "10032": "檔案不可超過 5 MB",
  "10033": "只接受 PDF、JPG、PNG 檔案"
};

const router = useRouter();
const authStore = useAuthStore();
const { logout } = useAuth();

const enrollment = ref<EnrollmentInfo | null>(authStore.user?.enrollment ?? null);
const loading = ref(false);
const error = ref("");

const file = ref<File | null>(null);
const fileError = ref("");
const uploading = ref(false);
const success = ref("");

const state = computed(() => enrollment.value?.state);
const canUpload = computed(() => ["required", "rejected", "pending"].includes(state.value ?? ""));
// 截止時間是 10/1 00:00，顯示成前一天 9/30
const deadlineText = computed(() => {
  const deadline = enrollment.value?.deadline;
  if (!deadline) return "";
  return formatTaipeiDate(new Date(new Date(deadline).getTime() - 1));
});

const toMessage = (err: unknown): string =>
  err instanceof ApiError && err.statusCode && ENROLLMENT_ERROR_MESSAGES[err.statusCode]
    ? ENROLLMENT_ERROR_MESSAGES[err.statusCode]
    : toErrorMessage(err);

const applyEnrollment = (info: EnrollmentInfo): void => {
  enrollment.value = info;
  authStore.setEnrollment(info);
};

onMounted(async () => {
  loading.value = true;
  error.value = "";
  try {
    applyEnrollment((await getEnrollment()).enrollment);
  } catch (err) {
    error.value = toMessage(err);
  } finally {
    loading.value = false;
  }
});

const handleFileChange = (event: Event): void => {
  const input = event.target as HTMLInputElement;
  const picked = input.files?.[0] ?? null;
  success.value = "";
  fileError.value = "";
  file.value = null;
  if (!picked) return;
  if (!ACCEPTED_TYPES.includes(picked.type)) {
    fileError.value = "只接受 PDF、JPG、PNG 檔案";
  } else if (picked.size > MAX_FILE_SIZE) {
    fileError.value = "檔案不可超過 5 MB";
  } else {
    file.value = picked;
  }
  if (fileError.value) input.value = "";
};

const handleUpload = async (): Promise<void> => {
  if (!file.value) return;
  uploading.value = true;
  fileError.value = "";
  success.value = "";
  try {
    applyEnrollment((await uploadEnrollmentProof(file.value)).enrollment);
    file.value = null;
    success.value = "已上傳在學證明，審核期間可以照常使用系統。";
  } catch (err) {
    fileError.value = toMessage(err);
  } finally {
    uploading.value = false;
  }
};

const goHome = async (): Promise<void> => {
  await router.push({ name: "dashboard" });
};

const handleLogout = async (): Promise<void> => {
  logout();
  await router.push({ name: "login" });
};
</script>

<template>
  <section class="verify">
    <div>
      <p class="verify__eyebrow">帳號</p>
      <h1>在學驗證</h1>
    </div>

    <p v-if="loading && !enrollment">載入中...</p>
    <p v-else-if="error" class="verify__error" role="alert">{{ error }}</p>

    <template v-else-if="enrollment">
      <dl class="verify__info">
        <div class="verify__row">
          <dt>學號</dt>
          <dd>{{ enrollment.campus_id }}</dd>
        </div>
        <div v-if="deadlineText" class="verify__row">
          <dt>驗證截止</dt>
          <dd>{{ deadlineText }}</dd>
        </div>
      </dl>

      <p v-if="state === 'required'" class="notice">
        依學號判斷，你已就學滿四年。請在 <strong>{{ deadlineText }}</strong> 前上傳在學證明，由管理員審核通過後可再使用一年；
        期限內沒有上傳，帳號會被停用。上傳後即可照常使用系統。
      </p>
      <div v-else-if="state === 'rejected'" class="notice notice--danger">
        <p>你上傳的在學證明未通過審核，請在 <strong>{{ deadlineText }}</strong> 前重新上傳。</p>
        <p v-if="enrollment.latest?.reason" class="notice__reason">原因：{{ enrollment.latest.reason }}</p>
      </div>
      <p v-else-if="state === 'pending'" class="notice notice--ok">
        已收到你的在學證明（{{ enrollment.latest?.original_name }}），正在等待管理員審核，審核期間可以照常使用系統。
        如果上傳錯檔案，可以在截止前重新上傳，會取代原本的檔案。
      </p>
      <p v-else-if="state === 'expired'" class="notice notice--danger">
        已超過驗證期限，帳號即將停用。如有疑問請聯絡管理員。
      </p>
      <p v-else class="notice">目前不需要在學驗證。</p>

      <form v-if="canUpload" class="upload" @submit.prevent="handleUpload">
        <label class="upload__field">
          <span>在學證明（PDF、JPG、PNG，5 MB 以內）</span>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" @change="handleFileChange" />
        </label>
        <p v-if="file" class="muted">{{ file.name }}・{{ formatFileSize(file.size) }}</p>
        <p v-if="fileError" class="verify__error" role="alert">{{ fileError }}</p>
        <p v-if="success" class="verify__success" role="status">{{ success }}</p>
        <div class="upload__actions">
          <button class="button button--primary" type="submit" :disabled="!file || uploading">
            {{ uploading ? "上傳中..." : state === "pending" ? "重新上傳" : "上傳" }}
          </button>
        </div>
      </form>

      <div class="verify__footer">
        <button v-if="!authStore.needsEnrollmentVerification" class="button" type="button" @click="goHome">前往首頁</button>
        <button class="link-button" type="button" @click="handleLogout">登出</button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.verify {
  display: grid;
  gap: 22px;
  width: min(560px, 100%);
}

.verify__eyebrow {
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

.verify__info {
  margin: 0;
  border-top: 2px solid #000;
}

.verify__row {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid #000;
}

.verify__row dt {
  color: #777;
  font-size: 14px;
}

.verify__row dd {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.notice {
  margin: 0;
  padding: 14px 16px;
  border: 1px solid #d9c98a;
  background: #fdfaee;
  color: #6b5a14;
  font-size: 14px;
  line-height: 1.7;
}

.notice p {
  margin: 0;
}

.notice--danger {
  border-color: #bd7676;
  background: #fdf4f4;
  color: #8c2020;
}

.notice--ok {
  border-color: #87aa8c;
  background: #f4faf5;
  color: #286133;
}

.notice__reason {
  margin-top: 6px !important;
  font-weight: 700;
}

.upload {
  display: grid;
  gap: 12px;
}

.upload__field {
  display: grid;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
}

.upload__field input {
  font: inherit;
  font-weight: 400;
}

.upload__actions,
.verify__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
}

.button {
  min-height: 40px;
  padding: 8px 20px;
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
  opacity: 0.4;
  cursor: not-allowed;
}

.link-button {
  border: 0;
  border-bottom: 1px solid #000;
  padding: 3px 0;
  background: transparent;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.verify__error {
  margin: 0;
  color: #c00;
  font-size: 14px;
}

.verify__success {
  margin: 0;
  color: #286133;
  font-size: 14px;
}

.muted {
  margin: 0;
  color: #777;
  font-size: 14px;
}
</style>
