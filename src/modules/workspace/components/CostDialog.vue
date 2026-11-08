<script setup lang="ts">
import { reactive, watch } from "vue";

import BaseModal from "@/shared/components/BaseModal.vue";
import type { ProjectCostPayload } from "@/modules/workspace/types/workspace.types";

const props = defineProps<{
  open: boolean;
  // 沒帶就是新增
  cost?: ProjectCostPayload | null;
  loading?: boolean;
  error?: string;
}>();

const emit = defineEmits<{ submit: [payload: ProjectCostPayload]; cancel: [] }>();

const form = reactive({ name: "", price: 0, quantity: 1, funding_source: "" });

// 每次打開都重設成目前要編輯的成本
watch(() => props.open, (open) => {
  if (!open) return;
  form.name = props.cost?.name ?? "";
  form.price = Number(props.cost?.price ?? 0);
  form.quantity = Number(props.cost?.quantity ?? 1);
  form.funding_source = props.cost?.funding_source ?? "";
}, { immediate: true });

const submit = (): void => {
  const name = form.name.trim();
  if (!name) return;
  emit("submit", {
    name,
    price: Math.max(0, Number(form.price) || 0),
    quantity: Math.max(1, Math.round(Number(form.quantity) || 1)),
    funding_source: form.funding_source.trim()
  });
};
</script>

<template>
  <BaseModal :open="open">
    <form class="cost-dialog" role="dialog" aria-modal="true" :aria-label="cost ? '修改成本' : '新增成本'" @submit.prevent="submit">
      <h2>{{ cost ? "修改成本" : "新增成本" }}</h2>
      <label class="field">項目<input v-model="form.name" maxlength="255" placeholder="例：場地租借" required /></label>
      <div class="field-row">
        <label class="field">金額（元）<input v-model.number="form.price" type="number" min="0" step="1" required /></label>
        <label class="field">個數<input v-model.number="form.quantity" type="number" min="1" step="1" required /></label>
      </div>
      <label class="field">經費來源<input v-model="form.funding_source" maxlength="255" placeholder="例：教育部補助（選填）" /></label>
      <p v-if="error" class="cost-dialog__error">{{ error }}</p>
      <div class="cost-dialog__actions">
        <button class="button" type="button" :disabled="loading" @click="emit('cancel')">取消</button>
        <button class="button button--primary" type="submit" :disabled="loading || !form.name.trim()">
          {{ loading ? "儲存中..." : cost ? "確定修改" : "新增" }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<style scoped>
.cost-dialog { display: grid; gap: 16px; width: min(420px, calc(100vw - 72px)); }
h2 { margin: 0; font-size: 17px; font-weight: 700; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field { display: grid; gap: 7px; color: #555; font-size: 14px; font-weight: 700; }
.field input { width: 100%; border: 1px solid #ccc; border-radius: 0; padding: 11px 12px; background: #fff; color: #111; font: inherit; font-size: 14px; outline: none; }
.field input:focus { border-color: #111; }
.cost-dialog__error { margin: 0; color: #8c2020; font-size: 14px; }
.cost-dialog__actions { display: flex; justify-content: flex-end; gap: 12px; }
.button { min-height: 40px; padding: 8px 16px; border: 1px solid #000; background: #fff; color: #000; font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
.button--primary { background: #000; color: #fff; }
.button:disabled { opacity: .5; cursor: not-allowed; }
</style>
