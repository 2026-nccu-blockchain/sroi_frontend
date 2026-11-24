<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";

import { approveEnrollment, getEnrollmentProof, getOneUser, rejectEnrollment } from "@/modules/admin/api/admin.api";
import { toAdminErrorMessage } from "@/modules/admin/constants";
import type { AdminUserDetail } from "@/modules/admin/types/admin.types";
import type { EnrollmentState } from "@/modules/auth/types/auth.types";
import { toFullEmail } from "@/modules/auth/utils/email";
import { ROLE_LABELS } from "@/modules/profile/constants";
import ConfirmDialog from "@/modules/workspace/components/ConfirmDialog.vue";
import { formatTaipeiDate } from "@/shared/utils/date";
import { formatFileSize } from "@/shared/utils/format";

const ENROLLMENT_STATE_LABELS: Record<EnrollmentState, string> = {
  not_student: "非學生",
  active: "正常",
  required: "需要驗證（尚未上傳）",
  pending: "待審核",
  rejected: "已退回，等待重新上傳",
  expired: "已逾期"
};

const route = useRoute();
const userId = String(route.params.userId);

const user = ref<AdminUserDetail | null>(null);
const loading = ref(false);
const pageError = ref("");

const enrollment = computed(() => (user.value?.enrollment?.is_student ? user.value.enrollment : null));
// 待審核的在學證明
const review = computed(() =>
  enrollment.value?.state === "pending" && enrollment.value.latest?.status === "pending" ? enrollment.value.latest : null
);
// 截止時間是 10/1 00:00，顯示成 9/30
const deadlineText = computed(() =>
  enrollment.value?.deadline ? formatTaipeiDate(new Date(new Date(enrollment.value.deadline).getTime() - 1)) : ""
);

const backTo = computed(() => ({
  name: "admin-users",
  query: { tab: review.value ? "enrollment" : (user.value?.role ?? "admin") }
}));

const loadUser = async (): Promise<void> => {
  user.value = await getOneUser(userId);
};

onMounted(async () => {
  loading.value = true;
  pageError.value = "";

  try {
    await loadUser();
  } catch (err) {
    pageError.value = toAdminErrorMessage(err);
  } finally {
    loading.value = false;
  }
});

// 查看證明：檔案要帶 token 下載，轉成 blob 網址再開新分頁
const opening = ref(false);
const actionError = ref("");

const openProof = async (): Promise<void> => {
  if (!review.value) return;
  // 先開視窗再填網址，避免瀏覽器把非同步開的視窗當成彈出式廣告擋掉
  const preview = window.open("", "_blank");
  opening.value = true;
  actionError.value = "";
  try {
    const blob = await getEnrollmentProof(review.value.verification_id);
    const url = URL.createObjectURL(blob);
    if (preview) preview.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    preview?.close();
    actionError.value = toAdminErrorMessage(err);
  } finally {
    opening.value = false;
  }
};

// 審核：通過跳確認窗；退回要填原因（學生會看到）
const confirmingApprove = ref(false);
const rejecting = ref(false);
const reason = ref("");
const deciding = ref(false);
const result = ref("");

const reloadAfterReview = async (): Promise<void> => {
  try {
    await loadUser();
  } catch (err) {
    pageError.value = toAdminErrorMessage(err);
  }
};

const handleApprove = async (): Promise<void> => {
  if (!user.value || !review.value) return;
  const { name } = user.value;
  deciding.value = true;
  actionError.value = "";
  result.value = "";
  try {
    await approveEnrollment(review.value.verification_id);
    result.value = `已通過，${name} 的帳號延長一年`;
  } catch (err) {
    actionError.value = toAdminErrorMessage(err);
  } finally {
    deciding.value = false;
    confirmingApprove.value = false;
  }
  await reloadAfterReview();
};

const handleReject = async (): Promise<void> => {
  if (!user.value || !review.value || !reason.value.trim()) return;
  const { name } = user.value;
  deciding.value = true;
  actionError.value = "";
  result.value = "";
  try {
    await rejectEnrollment(review.value.verification_id, reason.value.trim());
    result.value = `已退回 ${name} 的在學證明，學生需在截止前重新上傳`;
    rejecting.value = false;
    reason.value = "";
  } catch (err) {
    actionError.value = toAdminErrorMessage(err);
  } finally {
    deciding.value = false;
  }
  await reloadAfterReview();
};
</script>

<template>
  <section class="user-detail">
    <RouterLink class="user-detail__back" :to="backTo">← 所有使用者</RouterLink>

    <p v-if="loading">載入中...</p>
    <p v-else-if="pageError" class="user-detail__error">{{ pageError }}</p>

    <template v-else-if="user">
      <div class="user-detail__header">
        <p class="user-detail__eyebrow">{{ ROLE_LABELS[user.role] }}</p>
        <h1>{{ user.name }}</h1>
      </div>

      <p v-if="result" class="user-detail__result" role="status">{{ result }}</p>

      <dl class="info">
        <div class="info__row">
          <dt>姓名</dt>
          <dd>{{ user.name }}</dd>
        </div>
        <div class="info__row">
          <dt>電子郵件</dt>
          <dd>{{ toFullEmail(user.email) }}</dd>
        </div>
        <template v-if="enrollment">
          <div class="info__row">
            <dt>學號</dt>
            <dd>{{ enrollment.campus_id }}</dd>
          </div>
          <div class="info__row">
            <dt>在學驗證</dt>
            <dd>
              {{ ENROLLMENT_STATE_LABELS[enrollment.state] }}
              <span class="muted">・{{ enrollment.due_year }} 年驗證期，{{ deadlineText }} 截止</span>
            </dd>
          </div>
        </template>
        <div class="info__row">
          <dt>身分</dt>
          <dd>{{ ROLE_LABELS[user.role] }}</dd>
        </div>
      </dl>

      <section v-if="review" class="review">
        <h2>在學證明審核</h2>
        <p class="muted">上傳時間：{{ review.create_time ? formatTaipeiDate(review.create_time) : "—" }}</p>

        <div class="review__file">
          <span>{{ review.original_name }}・{{ formatFileSize(review.size_bytes) }}</span>
          <button class="button" type="button" :disabled="opening" @click="openProof">
            {{ opening ? "開啟中..." : "查看檔案" }}
          </button>
        </div>

        <p class="review__question">
          通過後 <strong>{{ user.name }}</strong> 的帳號可再使用一年，明年 9 月需要再次驗證；退回後學生需在 {{ deadlineText }} 前重新上傳，逾期帳號會被停用。
        </p>

        <label v-if="rejecting" class="review__reason">
          <span>退回原因<strong>（必填，學生會看到）</strong></span>
          <textarea v-model="reason" rows="3" placeholder="例如：證明文件模糊、不是本學期的在學證明" :disabled="deciding" />
        </label>

        <p v-if="actionError" class="user-detail__error" role="alert">{{ actionError }}</p>

        <div class="review__actions">
          <template v-if="rejecting">
            <button class="button" type="button" :disabled="deciding" @click="rejecting = false">取消</button>
            <button class="button button--danger" type="button" :disabled="deciding || !reason.trim()" @click="handleReject">
              {{ deciding ? "送出中..." : "確定退回" }}
            </button>
          </template>
          <template v-else>
            <button class="button button--danger" type="button" :disabled="deciding" @click="rejecting = true">退回</button>
            <button class="button button--primary" type="button" :disabled="deciding" @click="confirmingApprove = true">
              通過
            </button>
          </template>
        </div>
      </section>
    </template>

    <ConfirmDialog
      :open="confirmingApprove"
      title="通過在學驗證"
      :message="`確定通過 ${user?.name ?? ''} 的在學證明嗎？帳號會延長一年。`"
      confirm-text="通過"
      :loading="deciding"
      @confirm="handleApprove"
      @cancel="confirmingApprove = false"
    />
  </section>
</template>

<style scoped>
.user-detail {
  display: grid;
  gap: 22px;
  max-width: 760px;
}

.user-detail__back {
  justify-self: start;
  color: #000;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.user-detail__back:hover {
  text-decoration: underline;
}

.user-detail__eyebrow {
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

h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.user-detail__error {
  margin: 0;
  color: #c00;
}

.user-detail__result {
  margin: 0;
  padding: 12px 16px;
  border: 1px solid #000;
  font-size: 14px;
  font-weight: 700;
}

.info {
  margin: 0;
  border-top: 2px solid #000;
}

.info__row {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid #000;
}

.info dt {
  color: #777;
  font-size: 14px;
}

.info dd {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  word-break: break-all;
}

.review {
  display: grid;
  gap: 18px;
  padding: 20px;
  border: 1px solid #000;
}







.review__file {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #d8d8d8;
  font-size: 14px;
  overflow-wrap: anywhere;
}

.review__reason {
  display: grid;
  gap: 8px;
  font-size: 14px;
}

.review__reason strong {
  color: #c00;
}

.review__reason textarea {
  padding: 10px 12px;
  border: 1px solid #000;
  font: inherit;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
}

.review__question {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
}

.review__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
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

.button--primary:hover:not(:disabled) {
  background: #fff;
  color: #000;
}

.button--danger {
  border-color: #c00;
  color: #c00;
}

.button--danger:hover:not(:disabled) {
  background: #c00;
  color: #fff;
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.muted {
  margin: 0;
  font-weight: 400;
  color: #777;
  font-size: 14px;
}
</style>
