<script setup lang="ts">
import { ref, watch } from "vue";

import BaseModal from "@/shared/components/BaseModal.vue";

// 資料庫編輯者審核專案：先選同意或不同意，再按送出
const props = defineProps<{
  open: boolean;
  projectName: string;
  loading?: boolean;
}>();

const emit = defineEmits<{ submit: [approved: boolean]; cancel: [] }>();

const decision = ref<boolean | null>(null);

// 每次打開都重新選
watch(() => props.open, (open) => {
  if (open) decision.value = null;
});

const submit = (): void => {
  if (decision.value !== null) emit("submit", decision.value);
};
</script>

<template>
  <BaseModal :open="open">
    <div class="review" role="dialog" aria-modal="true" aria-label="審核專案">
      <h2>審核專案</h2>
      <p>「{{ projectName || "未命名專案" }}」</p>

      <div class="review__choices" role="radiogroup" aria-label="審核結果">
        <button
          type="button"
          role="radio"
          class="review__choice review__choice--approve"
          :class="{ 'review__choice--selected': decision === true }"
          :aria-checked="decision === true"
          :disabled="loading"
          @click="decision = true"
        >同意</button>
        <button
          type="button"
          role="radio"
          class="review__choice review__choice--reject"
          :class="{ 'review__choice--selected': decision === false }"
          :aria-checked="decision === false"
          :disabled="loading"
          @click="decision = false"
        >不同意</button>
      </div>

      <p class="review__hint">
        <template v-if="decision === true">同意後專案會發布至共用資料庫。</template>
        <template v-else-if="decision === false">不同意後專案會退回「已結案」，不會出現在共用資料庫。</template>
        <template v-else>請選擇審核結果。</template>
      </p>

      <div class="review__actions">
        <button class="button" type="button" :disabled="loading" @click="emit('cancel')">取消</button>
        <button class="button button--primary" type="button" :disabled="loading || decision === null" @click="submit">
          {{ loading ? "送出中…" : "送出" }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.review { display: grid; gap: 16px; width: min(380px, calc(100vw - 72px)); }
h2 { margin: 0; font-size: 17px; font-weight: 700; }
p { margin: 0; font-size: 14px; line-height: 1.6; }
.review__choices { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.review__choice { min-height: 44px; border: 1px solid #bbb; border-radius: 8px; background: #fff; color: #111; font: inherit; font-size: 15px; font-weight: 700; cursor: pointer; }
.review__choice:disabled { cursor: not-allowed; opacity: .6; }
.review__choice--approve.review__choice--selected { border-color: #2f7140; background: #e5f3e8; color: #2f7140; }
.review__choice--reject.review__choice--selected { border-color: #8c2020; background: #fbeaea; color: #8c2020; }
.review__hint { color: #555; }
.review__actions { display: flex; justify-content: flex-end; gap: 12px; }
.button { min-height: 36px; padding: 6px 14px; border: 1px solid #111; border-radius: 6px; background: #fff; color: #111; font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
.button--primary { background: #111; color: #fff; }
.button:disabled { cursor: not-allowed; opacity: .5; }
</style>
