<script setup lang="ts">
import { nextTick, ref, watch } from "vue";

import BaseModal from "@/shared/components/BaseModal.vue";

const props = withDefaults(defineProps<{
  open: boolean;
  title: string;
  message: string;
  // 會一起被刪掉的東西，逐條列出
  details?: string[];
  confirmText?: string;
  loading?: boolean;
}>(), {
  details: () => [],
  confirmText: "刪除",
  loading: false
});

const emit = defineEmits<{ confirm: []; cancel: [] }>();

// 打開時焦點放在「取消」，避免一按 Enter 就刪掉
const cancelButton = ref<HTMLButtonElement | null>(null);
watch(() => props.open, async (open) => {
  if (!open) return;
  await nextTick();
  cancelButton.value?.focus();
});

const cancel = (): void => {
  if (!props.loading) emit("cancel");
};
</script>

<template>
  <BaseModal :open="open">
    <div
      class="delete-confirm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
      aria-describedby="delete-confirm-message"
      @keydown.esc="cancel"
    >
      <div class="delete-confirm__icon" aria-hidden="true">!</div>
      <div class="delete-confirm__body">
        <h2 id="delete-confirm-title">{{ title }}</h2>
        <p id="delete-confirm-message">{{ message }}</p>
        <ul v-if="details.length">
          <li v-for="item in details" :key="item">{{ item }}</li>
        </ul>
      </div>
      <div class="delete-confirm__actions">
        <button ref="cancelButton" class="button" type="button" :disabled="loading" @click="cancel">取消</button>
        <button class="button button--danger" type="button" :disabled="loading" @click="emit('confirm')">
          {{ loading ? "處理中…" : confirmText }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.delete-confirm {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 14px 16px;
  width: min(420px, calc(100vw - 72px));
  color: #161616;
}
.delete-confirm__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #fdeaea;
  color: #c00;
  font-size: 22px;
  font-weight: 800;
}
.delete-confirm__body { display: grid; gap: 8px; min-width: 0; }
h2 { margin: 0; color: #c00; font-size: 18px; }
p { margin: 0; font-size: 14px; line-height: 1.6; overflow-wrap: anywhere; }
ul { margin: 0; padding-left: 20px; color: #555; font-size: 14px; line-height: 1.7; }
.delete-confirm__actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 10px; }
.button { min-height: 40px; border: 1px solid #000; padding: 8px 18px; background: #fff; color: #000; font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
.button--danger { border-color: #c00; background: #c00; color: #fff; }
.button--danger:hover { background: #a00; }
.button:disabled { cursor: not-allowed; opacity: .5; }
</style>
