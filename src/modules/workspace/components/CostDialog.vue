<script setup lang="ts">
import { reactive, watch } from "vue";

import BaseModal from "@/shared/components/BaseModal.vue";
import type { ProjectCost, ProjectCostPayload } from "@/modules/workspace/types/workspace.types";

const props = defineProps<{
  open: boolean;
  // 沒帶就是新增
  cost?: ProjectCost | null;
  loading?: boolean;
  error?: string;
}>();

const emit = defineEmits<{ submit: [payload: ProjectCostPayload]; cancel: [] }>();

const form = reactive({ name: "", price: 0, description: "" });

// 每次打開都重設成目前要編輯的成本
watch(() => props.open, (open) => {
  if (!open) return;
  form.name = props.cost?.name ?? "";
  form.price = Number(props.cost?.price ?? 0);
  form.description = props.cost?.description ?? "";
}, { immediate: true });

const submit = (): void => {
  const name = form.name.trim();
  if (!name) return;
  emit("submit", {
    name,
    price: Math.max(0, Number(form.price) || 0),
    description: form.description.trim()
  });
};
</script>

<template>
  <BaseModal :open="open">
    <form class="cost-dialog" role="dialog" aria-modal="true" :aria-label="cost ? '修改成本' : '新增成本'" @submit.prevent="submit">
      <h2>{{ cost ? "修改成本" : "新增成本" }}</h2>
      <label class="field">名稱<input v-model="form.name" maxlength="255" placeholder="例：場地租借" required /></label>
      <label class="field">金額（NT$）<input v-model.number="form.price" type="number" min="0" step="1" required /></label>
      <label class="field">說明<textarea v-model="form.description" rows="3" placeholder="選填"></textarea></label>
      <p v-if="error" class="cost-dialog__error">{{ error }}</p>
      <div class="cost-dialog__actions">
        <button class="button" type="button" :disabled="loading" @click="emit('cancel')">取消</button>
        <button class="button button--primary" type="submit" :disabled="loading || !form.name.trim()">
          {{ loading ? "儲存中..." : cost ? "儲存修改" : "新增" }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<style scoped>
.cost-dialog { display: grid; gap: 16px; width: min(420px, calc(100vw - 72px)); }
h2 { margin: 0; font-size: 17px; font-weight: 700; }
.field { display: grid; gap: 7px; color: #555; font-size: 11px; font-weight: 700; }
.field input, .field textarea { width: 100%; border: 1px solid #ccc; border-radius: 0; padding: 11px 12px; background: #fff; color: #111; font: inherit; font-size: 13px; outline: none; }
.field input:focus, .field textarea:focus { border-color: #111; }
.cost-dialog__error { margin: 0; color: #8c2020; font-size: 12px; }
.cost-dialog__actions { display: flex; justify-content: flex-end; gap: 12px; }
.button { min-height: 40px; padding: 8px 16px; border: 1px solid #000; background: #fff; color: #000; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
.button--primary { background: #000; color: #fff; }
.button:disabled { opacity: .5; cursor: not-allowed; }
</style>
