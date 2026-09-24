<script setup lang="ts">
import BaseModal from "@/shared/components/BaseModal.vue";

defineProps<{
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  loading?: boolean;
  danger?: boolean;
}>();

defineEmits<{ confirm: []; cancel: [] }>();
</script>

<template>
  <BaseModal :open="open">
    <div class="confirm" role="alertdialog" aria-modal="true" :aria-label="title">
      <h2>{{ title }}</h2>
      <p>{{ message }}</p>

      <div class="confirm__actions">
        <button class="button" type="button" :disabled="loading" @click="$emit('cancel')">取消</button>
        <button
          class="button button--primary"
          :class="{ 'button--danger': danger }"
          type="button"
          :disabled="loading"
          @click="$emit('confirm')"
        >
          {{ loading ? "處理中..." : (confirmText ?? "確定") }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.confirm {
  display: grid;
  gap: 16px;
  max-width: 360px;
}

h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
}

.confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.button {
  min-height: 40px;
  padding: 8px 16px;
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

.button--danger {
  border-color: #c00;
  background: #c00;
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
