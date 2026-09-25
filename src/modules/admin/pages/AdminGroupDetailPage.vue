<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";

import { approveGroup, getOneGroup, rejectGroup } from "@/modules/admin/api/admin.api";
import { toAdminErrorMessage } from "@/modules/admin/constants";
import type { ReviewDecision } from "@/modules/admin/types/admin.types";
import GroupDetail from "@/modules/workspace/components/GroupDetail.vue";
import { GROUP_BUCKET_LABELS, STATUS_TO_BUCKET } from "@/modules/workspace/constants";
import type { GroupInfo } from "@/modules/workspace/types/workspace.types";

const props = defineProps<{ groupId: string }>();

const group = ref<GroupInfo | null>(null);
const loading = ref(false);
const pageError = ref("");

const bucket = computed(() => (group.value ? STATUS_TO_BUCKET[group.value.status] : "inProgress"));
const backTo = computed(() => ({ name: "admin-groups", query: { tab: bucket.value } }));

const loadGroup = async (): Promise<void> => {
  group.value = await getOneGroup(props.groupId);
};

onMounted(async () => {
  loading.value = true;
  pageError.value = "";

  try {
    await loadGroup();
  } catch (err) {
    pageError.value = toAdminErrorMessage(err);
  } finally {
    loading.value = false;
  }
});

// 審核：先選同意 / 不同意，再按送出；不同意一定要填原因
const decision = ref<ReviewDecision | null>(null);
const reason = ref("");
const reasonInput = ref<HTMLTextAreaElement | null>(null);
const submitting = ref(false);
const actionError = ref("");
const result = ref("");

const reasonMissing = computed(() => decision.value === "reject" && !reason.value.trim());
const canSubmit = computed(() => decision.value !== null && !reasonMissing.value && !submitting.value);

const choose = async (value: ReviewDecision): Promise<void> => {
  decision.value = value;
  actionError.value = "";
  if (value === "reject") {
    await nextTick();
    reasonInput.value?.focus();
  }
};

const handleSubmit = async (): Promise<void> => {
  if (!group.value || !canSubmit.value) return;

  const chosen = decision.value;
  const { title } = group.value;
  submitting.value = true;
  actionError.value = "";
  result.value = "";

  try {
    if (chosen === "approve") {
      await approveGroup(props.groupId);
      result.value = `已同意，「${title}」已移到實作中`;
    } else {
      await rejectGroup(props.groupId, reason.value.trim());
      result.value = `已不同意「${title}」的申請`;
    }
    decision.value = null;
    reason.value = "";
  } catch (err) {
    actionError.value = toAdminErrorMessage(err);
    return;
  } finally {
    submitting.value = false;
  }

  // 審核後重新讀取，審核區塊會消失，並顯示最新狀態與原因
  try {
    await loadGroup();
  } catch (err) {
    pageError.value = toAdminErrorMessage(err);
  }
};
</script>

<template>
  <section class="group-page">
    <RouterLink class="back-link" :to="backTo">← 所有群組</RouterLink>

    <p v-if="loading">載入中...</p>
    <p v-else-if="pageError" class="error">{{ pageError }}</p>

    <template v-else-if="group">
      <p v-if="result" class="result" role="status">{{ result }}</p>

      <GroupDetail :group="group" :eyebrow="GROUP_BUCKET_LABELS[bucket]">
        <form v-if="group.status === 'in_progress'" class="review" @submit.prevent="handleSubmit">
          <h2>審核申請</h2>

          <div class="review__choices" role="radiogroup" aria-label="審核結果">
            <button
              type="button"
              class="choice"
              :class="{ 'choice--selected': decision === 'approve' }"
              role="radio"
              :aria-checked="decision === 'approve'"
              :disabled="submitting"
              @click="choose('approve')"
            >
              同意
            </button>
            <button
              type="button"
              class="choice choice--danger"
              :class="{ 'choice--selected': decision === 'reject' }"
              role="radio"
              :aria-checked="decision === 'reject'"
              :disabled="submitting"
              @click="choose('reject')"
            >
              不同意
            </button>
          </div>

          <label v-if="decision === 'reject'" class="review__reason">
            <span>不同意原因<strong>（必填）</strong></span>
            <textarea
              ref="reasonInput"
              v-model="reason"
              rows="4"
              required
              placeholder="請說明不同意的原因，申請人會看到這段文字"
              :disabled="submitting"
            />
            <small v-if="reasonMissing" class="error">請輸入不同意的原因</small>
          </label>

          <p v-if="actionError" class="error" role="alert">{{ actionError }}</p>

          <div class="review__actions">
            <button class="submit" type="submit" :disabled="!canSubmit">
              {{ submitting ? "送出中..." : "送出" }}
            </button>
          </div>
        </form>
      </GroupDetail>
    </template>
  </section>
</template>

<style scoped>
.group-page {
  display: grid;
  gap: 22px;
  margin-top: -16px;
}

.back-link {
  justify-self: start;
  color: #000;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
}

.error {
  margin: 0;
  color: #c00;
}

.result {
  margin: 0;
  padding: 12px 16px;
  border: 1px solid #000;
  font-size: 14px;
  font-weight: 700;
}

.review {
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 1px solid #000;
}

.review h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.review__choices {
  display: flex;
  gap: 8px;
}

.choice,
.submit {
  min-height: 42px;
  padding: 8px 20px;
  border: 1px solid #000;
  background: #fff;
  color: #000;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.choice--selected {
  background: #000;
  color: #fff;
}

.choice--danger {
  border-color: #c00;
  color: #c00;
}

.choice--danger.choice--selected {
  background: #c00;
  color: #fff;
}

.review__reason {
  display: grid;
  gap: 8px;
  font-size: 13px;
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

.review__actions {
  display: flex;
  justify-content: flex-end;
}

.submit {
  background: #000;
  color: #fff;
}

.submit:disabled,
.choice:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
