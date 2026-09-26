<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";

import { getOneUser, reviewRequest } from "@/modules/admin/api/admin.api";
import IdCardImage from "@/modules/admin/components/IdCardImage.vue";
import { toAdminErrorMessage } from "@/modules/admin/constants";
import type { AdminUserDetail, ReviewDecision, ReviewKind } from "@/modules/admin/types/admin.types";
import { ROLE_LABELS } from "@/modules/profile/constants";
import ConfirmDialog from "@/modules/workspace/components/ConfirmDialog.vue";
import { formatDate } from "@/shared/utils/date";

interface PendingReview {
  kind: ReviewKind;
  campusId: string;
  idCardLink: string;
  createTime?: string;
}

const route = useRoute();
const userId = String(route.params.userId);

const user = ref<AdminUserDetail | null>(null);
const loading = ref(false);
const pageError = ref("");

// 驗證中的帳號，後端回傳的學號與照片就是申請中的資料
const review = computed<PendingReview | null>(() => {
  const current = user.value;
  if (!current) return null;

  if (current.role === "in_progress" && current.campus_id && current.id_card_link) {
    return { kind: "verification", campusId: current.campus_id, idCardLink: current.id_card_link };
  }

  if (current.change_request) {
    const { campus_id, id_card_link, create_time } = current.change_request;
    return { kind: "change", campusId: campus_id, idCardLink: id_card_link, createTime: create_time };
  }

  return null;
});

// 已審核通過的學號；驗證中的帳號還沒有
const approvedCampusId = computed(() =>
  user.value && user.value.role !== "in_progress" ? user.value.campus_id : undefined
);
const approvedIdCard = computed(() =>
  user.value && user.value.role !== "in_progress" ? user.value.id_card_link : undefined
);

const backTo = computed(() => ({
  name: "admin-users",
  query: { tab: review.value?.kind === "change" ? "change_request" : (user.value?.role ?? "admin") }
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

// 審核
const decision = ref<ReviewDecision | null>(null);
const deciding = ref(false);
const actionError = ref("");
const result = ref("");

const confirmDialog = computed(() => {
  const empty = { title: "", message: "", confirmText: "", danger: false };
  if (!decision.value || !user.value || !review.value) return empty;

  const approve = decision.value === "approve";
  const { name, campus_id } = user.value;
  const newId = review.value.campusId;

  if (review.value.kind === "verification") {
    return approve
      ? {
          title: "同意驗證",
          message: `確定同意 ${name}（${newId}）的驗證申請嗎？同意後帳號會成為已驗證使用者。`,
          confirmText: "同意",
          danger: false
        }
      : {
          title: "不同意驗證",
          message: `確定不同意 ${name}（${newId}）的驗證申請嗎？帳號會退回未驗證，使用者需要重新申請。`,
          confirmText: "不同意",
          danger: true
        };
  }

  return approve
    ? {
        title: "同意變更學號",
        message: `確定將 ${name} 的學號由 ${campus_id} 變更為 ${newId} 嗎？帳號權限不會改變。`,
        confirmText: "同意",
        danger: false
      }
    : {
        title: "不同意變更學號",
        message: `確定不同意 ${name} 的學號變更申請嗎？學號會維持 ${campus_id}。`,
        confirmText: "不同意",
        danger: true
      };
});

const RESULT_TEXT: Record<ReviewKind, Record<ReviewDecision, (name: string) => string>> = {
  verification: {
    approve: (name) => `已同意，${name} 現在是已驗證使用者`,
    reject: (name) => `已退回 ${name} 的驗證申請`
  },
  change: {
    approve: (name) => `已同意，${name} 的學號已更新`,
    reject: (name) => `已退回 ${name} 的學號變更申請`
  }
};

const handleDecision = async (): Promise<void> => {
  if (!user.value || !review.value || !decision.value) return;

  const { kind } = review.value;
  const chosen = decision.value;
  const { name } = user.value;
  deciding.value = true;
  actionError.value = "";
  result.value = "";

  try {
    await reviewRequest(kind, chosen, user.value.user_id);
    result.value = RESULT_TEXT[kind][chosen](name);
  } catch (err) {
    actionError.value = toAdminErrorMessage(err);
  } finally {
    deciding.value = false;
    decision.value = null;
  }

  // 審核後重新讀取，顯示最新的身分與學號
  try {
    await loadUser();
  } catch (err) {
    pageError.value = toAdminErrorMessage(err);
  }
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
          <dt>Email</dt>
          <dd>{{ user.email }}</dd>
        </div>
        <div class="info__row">
          <dt>學號</dt>
          <dd>{{ approvedCampusId || "—" }}</dd>
        </div>
        <div class="info__row">
          <dt>身分</dt>
          <dd>{{ ROLE_LABELS[user.role] }}</dd>
        </div>
      </dl>

      <section v-if="review" class="review">
        <h2>{{ review.kind === "verification" ? "驗證申請" : "學號變更申請" }}</h2>
        <p v-if="review.createTime" class="muted">申請時間：{{ formatDate(new Date(review.createTime)) }}</p>

        <div v-if="review.kind === 'verification'" class="review__field">
          <span class="review__label">申請驗證的學號</span>
          <span class="review__campus-id">{{ review.campusId }}</span>
        </div>

        <div v-else class="review__compare">
          <div class="review__field">
            <span class="review__label">目前學號</span>
            <span class="review__campus-id review__campus-id--old">{{ user.campus_id }}</span>
          </div>
          <span class="review__arrow" aria-hidden="true">→</span>
          <div class="review__field">
            <span class="review__label">申請變更為</span>
            <span class="review__campus-id">{{ review.campusId }}</span>
          </div>
        </div>

        <div class="review__images">
          <div class="review__field">
            <span class="review__label">{{ review.kind === "verification" ? "學生證照片" : "新的學生證照片" }}</span>
            <IdCardImage :filename="review.idCardLink" :alt="`${user.name} 申請的學生證`" />
          </div>
          <div v-if="review.kind === 'change' && approvedIdCard" class="review__field">
            <span class="review__label">目前的學生證照片</span>
            <IdCardImage :filename="approvedIdCard" :alt="`${user.name} 目前的學生證`" />
          </div>
        </div>

        <p v-if="review.kind === 'verification'" class="review__question">
          請確認照片上的學號、姓名與申請資料相符。是否同意 <strong>{{ user.name }}</strong> 以學號
          <strong>{{ review.campusId }}</strong> 完成身分驗證？
        </p>
        <p v-else class="review__question">
          請確認新照片上的學號、姓名與申請資料相符。是否同意將 <strong>{{ user.name }}</strong> 的學號變更為
          <strong>{{ review.campusId }}</strong>？審核期間與審核後，此帳號的權限和群組都不會改變。
        </p>

        <p v-if="actionError" class="user-detail__error" role="alert">{{ actionError }}</p>

        <div class="review__actions">
          <button class="button button--danger" type="button" :disabled="deciding" @click="decision = 'reject'">
            不同意
          </button>
          <button class="button button--primary" type="button" :disabled="deciding" @click="decision = 'approve'">
            同意
          </button>
        </div>
      </section>

      <section v-else-if="approvedIdCard" class="review">
        <h2>學生證照片</h2>
        <IdCardImage :filename="approvedIdCard" :alt="`${user.name} 的學生證`" />
      </section>
    </template>

    <ConfirmDialog
      :open="decision !== null"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-text="confirmDialog.confirmText"
      :danger="confirmDialog.danger"
      :loading="deciding"
      @confirm="handleDecision"
      @cancel="decision = null"
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
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}

.user-detail__back:hover {
  text-decoration: underline;
}

.user-detail__eyebrow {
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
  font-size: 13px;
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

.review__field {
  display: grid;
  gap: 8px;
  align-content: start;
  min-width: 0;
}

.review__label {
  color: #777;
  font-size: 12px;
}

.review__campus-id {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.05em;
  word-break: break-all;
}

.review__campus-id--old {
  color: #777;
  text-decoration: line-through;
}

.review__compare {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 16px;
}

.review__arrow {
  font-size: 22px;
}

.review__images {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
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
  color: #777;
  font-size: 13px;
}
</style>
