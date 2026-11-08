<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";

import { getOneUser, reviewChangeRequest } from "@/modules/admin/api/admin.api";
import { toAdminErrorMessage } from "@/modules/admin/constants";
import type { AdminUserDetail, ReviewDecision } from "@/modules/admin/types/admin.types";
import { ROLE_LABELS } from "@/modules/profile/constants";
import ConfirmDialog from "@/modules/workspace/components/ConfirmDialog.vue";
import { formatDate } from "@/shared/utils/date";

const route = useRoute();
const userId = String(route.params.userId);

const user = ref<AdminUserDetail | null>(null);
const loading = ref(false);
const pageError = ref("");

const review = computed(() => user.value?.change_request ?? null);

const backTo = computed(() => ({
  name: "admin-users",
  query: { tab: review.value ? "change_request" : (user.value?.role ?? "admin") }
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
  const newId = review.value.campus_id;
  const current = campus_id || "（尚無學號）";

  return approve
    ? {
        title: "同意變更學號",
        message: `確定將 ${name} 的學號由 ${current} 變更為 ${newId} 嗎？帳號權限不會改變。`,
        confirmText: "同意",
        danger: false
      }
    : {
        title: "不同意變更學號",
        message: `確定不同意 ${name} 的學號變更申請嗎？學號會維持 ${current}。`,
        confirmText: "不同意",
        danger: true
      };
});

const RESULT_TEXT: Record<ReviewDecision, (name: string) => string> = {
  approve: (name) => `已同意，${name} 的學號已更新`,
  reject: (name) => `已退回 ${name} 的學號變更申請`
};

const handleDecision = async (): Promise<void> => {
  if (!user.value || !review.value || !decision.value) return;

  const chosen = decision.value;
  const { name } = user.value;
  deciding.value = true;
  actionError.value = "";
  result.value = "";

  try {
    await reviewChangeRequest(chosen, user.value.user_id);
    result.value = RESULT_TEXT[chosen](name);
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
          <dt>電子郵件</dt>
          <dd>{{ user.email }}</dd>
        </div>
        <div class="info__row">
          <dt>學號</dt>
          <dd>{{ user.campus_id || "—" }}</dd>
        </div>
        <div class="info__row">
          <dt>身分</dt>
          <dd>{{ ROLE_LABELS[user.role] }}</dd>
        </div>
      </dl>

      <section v-if="review" class="review">
        <h2>學號變更申請</h2>
        <p class="muted">申請時間：{{ formatDate(new Date(review.create_time)) }}</p>

        <div class="review__compare">
          <div class="review__field">
            <span class="review__label">目前學號</span>
            <span class="review__campus-id review__campus-id--old">{{ user.campus_id || "—" }}</span>
          </div>
          <span class="review__arrow" aria-hidden="true">→</span>
          <div class="review__field">
            <span class="review__label">申請變更為</span>
            <span class="review__campus-id">{{ review.campus_id }}</span>
          </div>
        </div>

        <p class="review__question">
          是否同意將 <strong>{{ user.name }}</strong> 的學號變更為 <strong>{{ review.campus_id }}</strong>？審核期間與審核後，此帳號的權限和群組都不會改變。
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

.review__field {
  display: grid;
  gap: 8px;
  align-content: start;
  min-width: 0;
}

.review__label {
  color: #777;
  font-size: 14px;
}

.review__campus-id {
  font-size: 18px;
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
  font-size: 18px;
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
  color: #777;
  font-size: 14px;
}
</style>
