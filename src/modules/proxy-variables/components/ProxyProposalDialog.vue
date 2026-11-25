<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import {
  createFinancialProxy,
  proxyCurrencies,
  updateFinancialProxy,
  type FinancialProxy,
  type FinancialProxyInput
} from "../api/financialProxy.api";

const props = defineProps<{ proposal?: FinancialProxy }>();
const emit = defineEmits<{
  close: [];
  submitted: [FinancialProxy];
}>();
const dialog = ref<HTMLDialogElement | null>(null);
const doneButton = ref<HTMLButtonElement | null>(null);
const form = ref<Omit<FinancialProxyInput, "unit">>({
  name: props.proposal?.name ?? "",
  value: props.proposal?.value ?? "",
  currency: props.proposal?.currency ?? "TWD",
  note: props.proposal?.note ?? ""
});
const submitted = ref<FinancialProxy | null>(null);
const saving = ref(false);
const error = ref("");

onMounted(() => dialog.value?.showModal());

const submit = async (): Promise<void> => {
  if (saving.value) return;
  const name = form.value.name.trim();
  const value = form.value.value.trim();
  if (!name) {
    error.value = "請輸入名稱。";
    return;
  }
  if (!/^[+-]?(?:\d{1,14}(?:\.\d{0,4})?|\.\d{1,4})$/.test(value)) {
    error.value = "請輸入有效金額，整數最多 14 位，小數最多 4 位。";
    return;
  }

  const data = {
    ...form.value,
    name,
    value,
    note: form.value.note.trim()
  };
  saving.value = true;
  error.value = "";
  try {
    const result = props.proposal
      ? await updateFinancialProxy(props.proposal.proxy_id, { ...data, unit: props.proposal.unit })
      : await createFinancialProxy(data);
    submitted.value = result;
    emit("submitted", result);
    await nextTick();
    doneButton.value?.focus();
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "送審失敗，請稍後再試。";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <dialog ref="dialog" class="proposal-dialog" aria-labelledby="proposal-dialog-title"
    @cancel="saving && $event.preventDefault()" @close="emit('close')">
    <header class="proposal-header">
      <h2 id="proposal-dialog-title">
        {{ submitted ? "已送出審核" : proposal ? "修改財務代理變數" : "新增財務代理變數" }}
      </h2>
      <button type="button" class="close-button" aria-label="關閉" :disabled="saving" @click="dialog?.close()">×</button>
    </header>

    <section v-if="submitted" class="confirmation">
      <p role="status"><strong>{{ submitted.name }}</strong> 正在等待審核。通過後就會出現在 SROI 的選項中。</p>
      <RouterLink :to="{ name: 'proxy-variables', query: { tab: 'mine' } }" @click="dialog?.close()">查看我的申請</RouterLink>
      <footer><button ref="doneButton" type="button" class="primary" @click="dialog?.close()">完成</button></footer>
    </section>

    <form v-else @submit.prevent="submit">
      <label>名稱（年份/月）
        <input v-model="form.name" maxlength="255" required autofocus placeholder="例：課後輔導鐘點費" />
      </label>
      <div class="amount-fields">
        <label>原幣金額
          <input v-model="form.value" inputmode="decimal" maxlength="20" required />
        </label>
        <label>幣別
          <select v-model="form.currency">
            <option v-for="(label, code) in proxyCurrencies" :key="code" :value="code">{{ label }}（{{ code }}）</option>
          </select>
        </label>
      </div>
      <label>來源或備註
        <textarea v-model="form.note" rows="3" placeholder="例如資料來源、估價依據（選填）"></textarea>
      </label>
      <p class="hint">通過審核後即可用於 SROI 計算。</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <footer>
        <button type="button" :disabled="saving" @click="dialog?.close()">取消</button>
        <button type="submit" class="primary" :disabled="saving">{{ saving ? "送審中…" : "送出審核" }}</button>
      </footer>
    </form>
  </dialog>
</template>

<style scoped>
.proposal-dialog { box-sizing: border-box; width: min(510px, calc(100% - 32px)); max-height: calc(100dvh - 32px); overflow: auto; border: 1px solid #d1d1d1; border-radius: 12px; padding: 24px; background: #fff; color: #111; box-shadow: 0 16px 48px #0003; }
.proposal-dialog::backdrop { background: #0007; }
.proposal-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
h2, p { margin: 0; }
h2 { font-size: 19px; }
form, .confirmation { display: grid; gap: 16px; }
.confirmation p { line-height: 1.65; }
.confirmation a { justify-self: start; color: #333; font-size: 14px; text-underline-offset: 3px; }
.amount-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
label { display: grid; min-width: 0; gap: 6px; font-size: 14px; font-weight: 650; }
input, select, textarea { box-sizing: border-box; width: 100%; padding: 9px 10px; border: 1px solid #bbb; border-radius: 6px; color: #111; background: #fff; font: inherit; font-weight: 400; }
textarea { resize: vertical; }
.hint, .error { font-size: 14px; }
.hint { color: #555; }
.error { color: #a12424; }
footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
button { border: 1px solid #bbb; border-radius: 6px; padding: 9px 14px; color: #111; background: #fff; font: inherit; font-size: 14px; cursor: pointer; }
button:disabled { opacity: .55; cursor: wait; }
.close-button { border: 0; padding: 4px 9px; font-size: 20px; }
.primary { border-color: #111; color: #fff; background: #111; }
@media (max-width: 420px) { .amount-fields { grid-template-columns: 1fr; } }
</style>
