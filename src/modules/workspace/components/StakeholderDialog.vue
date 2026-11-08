<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";

import ConfirmDialog from "@/modules/workspace/components/ConfirmDialog.vue";
import CostDialog from "@/modules/workspace/components/CostDialog.vue";
import { STAKEHOLDER_OTHER, STAKEHOLDER_RELATIONS, STAKEHOLDER_TYPES } from "@/modules/workspace/constants";
import type {
  LinkedProjectForm,
  ProjectCostPayload,
  StakeholderDraft
} from "@/modules/workspace/types/workspace.types";

// 新增／編輯一位利害關係人；按「儲存」只寫回編輯頁的暫存資料，按「儲存專案」才會存入資料庫
const props = defineProps<{
  open: boolean;
  // 沒帶就是新增
  stakeholder: StakeholderDraft | null;
  forms: LinkedProjectForm[];
  readOnly?: boolean;
  // 產生新項目的 key（跟編輯頁共用同一組流水號）
  newKey: () => string;
}>();

const emit = defineEmits<{ save: [stakeholder: StakeholderDraft]; close: [] }>();

type DraftCost = StakeholderDraft["costs"][number];

const form = reactive<StakeholderDraft>({
  key: "",
  name: "",
  relation: "",
  stakeholder_type: "",
  notes: "",
  pre_form_id: null,
  post_form_id: null,
  outcomes: [],
  costs: []
});

// 下拉選單的選項與「其他」的自訂文字分開存，儲存時再合成一個值
const relationChoice = ref("");
const relationOther = ref("");
const typeChoice = ref("");
const typeOther = ref("");

const newOutcomeName = ref("");
const error = ref("");
const costDialogOpen = ref(false);
const editingCost = ref<DraftCost | null>(null);
const deletingCost = ref<DraftCost | null>(null);
const discardDialogOpen = ref(false);
// 打開時的內容，用來判斷關閉時要不要提醒
const initialSnapshot = ref("");

const splitChoice = (value: string, options: string[]): [string, string] => {
  if (!value) return ["", ""];
  if (options.includes(value) && value !== STAKEHOLDER_OTHER) return [value, ""];
  return [STAKEHOLDER_OTHER, value === STAKEHOLDER_OTHER ? "" : value];
};

const joinChoice = (choice: string, other: string): string =>
  choice === STAKEHOLDER_OTHER ? other.trim() || STAKEHOLDER_OTHER : choice;

const result = (): StakeholderDraft => ({
  key: form.key,
  stakeholder_id: form.stakeholder_id,
  name: form.name.trim(),
  relation: joinChoice(relationChoice.value, relationOther.value),
  stakeholder_type: joinChoice(typeChoice.value, typeOther.value),
  notes: form.notes.trim(),
  pre_form_id: form.pre_form_id || null,
  post_form_id: form.post_form_id || null,
  outcomes: form.outcomes.map((outcome) => ({ ...outcome })),
  costs: form.costs.map((cost) => ({ ...cost }))
});

const snapshot = (): string => JSON.stringify(result());

// 每次打開都複製一份，取消時不影響編輯頁的資料
watch(
  () => props.open,
  (open) => {
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) return;
    const source = props.stakeholder;
    Object.assign(form, {
      key: source?.key ?? props.newKey(),
      stakeholder_id: source?.stakeholder_id,
      name: source?.name ?? "",
      relation: source?.relation ?? "",
      stakeholder_type: source?.stakeholder_type ?? "",
      notes: source?.notes ?? "",
      pre_form_id: source?.pre_form_id ?? null,
      post_form_id: source?.post_form_id ?? null,
      outcomes: (source?.outcomes ?? []).map((outcome) => ({ ...outcome })),
      costs: (source?.costs ?? []).map((cost) => ({ ...cost }))
    });
    [relationChoice.value, relationOther.value] = splitChoice(form.relation, STAKEHOLDER_RELATIONS);
    [typeChoice.value, typeOther.value] = splitChoice(form.stakeholder_type, STAKEHOLDER_TYPES);
    newOutcomeName.value = "";
    error.value = "";
    initialSnapshot.value = snapshot();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  document.body.style.overflow = "";
});

const title = computed(() => {
  if (props.readOnly) return "檢視利害關係人";
  return props.stakeholder ? "編輯利害關係人" : "新增利害關係人";
});

const totalCost = computed(() =>
  form.costs.reduce((total, cost) => total + Number(cost.price) * Number(cost.quantity), 0)
);

const formatMoney = (value: number | string): string => `${Number(value || 0).toLocaleString("zh-TW")} 元`;

const confirmOutcome = (): void => {
  const name = newOutcomeName.value.trim();
  if (!name) return;
  if (form.outcomes.some((outcome) => outcome.name.trim().toLowerCase() === name.toLowerCase())) {
    error.value = "這個成果已經列入";
    return;
  }
  form.outcomes.push({ name });
  newOutcomeName.value = "";
  error.value = "";
};

const removeOutcome = (index: number): void => {
  form.outcomes.splice(index, 1);
};

const openCostDialog = (cost: DraftCost | null = null): void => {
  editingCost.value = cost;
  costDialogOpen.value = true;
};

const closeCostDialog = (): void => {
  costDialogOpen.value = false;
  editingCost.value = null;
};

const submitCost = (payload: ProjectCostPayload): void => {
  if (editingCost.value) Object.assign(editingCost.value, payload);
  else form.costs.push({ key: props.newKey(), ...payload });
  closeCostDialog();
};

const confirmDeleteCost = (): void => {
  const target = deletingCost.value;
  if (target) form.costs = form.costs.filter((cost) => cost.key !== target.key);
  deletingCost.value = null;
};

const save = (): void => {
  if (!form.name.trim()) {
    error.value = "請輸入利害關係人名稱";
    return;
  }
  emit("save", result());
};

// 有改過就先確認，避免誤按叉叉丟掉內容
const requestClose = (): void => {
  if (!props.readOnly && snapshot() !== initialSnapshot.value) {
    discardDialogOpen.value = true;
    return;
  }
  emit("close");
};

const confirmDiscard = (): void => {
  discardDialogOpen.value = false;
  emit("close");
};
</script>

<template>
  <div v-if="open" class="stakeholder-dialog" role="dialog" aria-modal="true" :aria-label="title">
    <div class="stakeholder-dialog__panel">
      <header class="stakeholder-dialog__header">
        <h2>{{ title }}</h2>
        <button class="stakeholder-dialog__close" type="button" aria-label="關閉" @click="requestClose">×</button>
      </header>

      <fieldset class="stakeholder-dialog__body" :disabled="readOnly">
        <section class="dialog-section">
          <h3>基本資料</h3>
          <div class="dialog-grid">
            <label class="field field--wide">名稱（必填）
              <input v-model="form.name" maxlength="255" placeholder="例：計畫參與者" @input="error = ''" />
            </label>
            <div class="field">
              <label for="stakeholder-relation">關係</label>
              <select id="stakeholder-relation" v-model="relationChoice">
                <option value="">請選擇</option>
                <option v-for="option in STAKEHOLDER_RELATIONS" :key="option" :value="option">{{ option }}</option>
              </select>
              <input
                v-if="relationChoice === STAKEHOLDER_OTHER"
                v-model="relationOther"
                maxlength="100"
                placeholder="請輸入關係"
                aria-label="自訂關係"
              />
            </div>
            <div class="field">
              <label for="stakeholder-type">類型</label>
              <select id="stakeholder-type" v-model="typeChoice">
                <option value="">請選擇</option>
                <option v-for="option in STAKEHOLDER_TYPES" :key="option" :value="option">{{ option }}</option>
              </select>
              <input
                v-if="typeChoice === STAKEHOLDER_OTHER"
                v-model="typeOther"
                maxlength="100"
                placeholder="請輸入類型"
                aria-label="自訂類型"
              />
            </div>
          </div>
        </section>

        <section class="dialog-section">
          <div class="dialog-section__heading">
            <h3>成果初列</h3>
            <p v-if="!readOnly">確認後會變成標籤：編輯中的表單會同步，已發布的表單會保留原版本。</p>
          </div>
          <div v-if="!readOnly" class="outcome-composer">
            <input
              v-model="newOutcomeName"
              maxlength="255"
              placeholder="例：提升團隊合作能力"
              aria-label="成果名稱"
              @keydown.enter.prevent="confirmOutcome"
            />
            <button class="secondary-button" type="button" :disabled="!newOutcomeName.trim()" @click="confirmOutcome">
              確認新增
            </button>
          </div>
          <div v-if="form.outcomes.length" class="outcome-tags" aria-label="已列入成果">
            <button
              v-for="(outcome, index) in form.outcomes"
              :key="outcome.outcome_id || `${outcome.name}-${index}`"
              type="button"
              :aria-label="`刪除成果 ${outcome.name}`"
              :title="`刪除 ${outcome.name}`"
              @click="removeOutcome(index)"
            >
              <span>#{{ outcome.name }}</span><b aria-hidden="true">×</b>
            </button>
          </div>
          <p v-else class="empty-state">尚未初列成果。</p>
        </section>

        <section class="dialog-section">
          <div class="dialog-section__heading">
            <div>
              <h3>成本明細</h3>
              <p v-if="!readOnly">小計為「金額 × 個數」；專案總成本是所有利害關係人的成本加總。</p>
            </div>
            <button v-if="!readOnly" class="secondary-button" type="button" @click="openCostDialog()">＋ 新增成本</button>
          </div>
          <p v-if="!form.costs.length" class="empty-state">尚未新增成本。</p>
          <article v-for="(cost, index) in form.costs" :key="cost.key" class="cost-row">
            <span class="row-number">{{ String(index + 1).padStart(2, "0") }}</span>
            <div class="field">項目<span class="cost-value">{{ cost.name }}</span></div>
            <div class="field">金額<span class="cost-value">{{ formatMoney(cost.price) }}</span></div>
            <div class="field">個數<span class="cost-value">{{ cost.quantity }}</span></div>
            <div class="field">小計<span class="cost-value">{{ formatMoney(cost.price * cost.quantity) }}</span></div>
            <div class="field">經費來源<span class="cost-value">{{ cost.funding_source || "—" }}</span></div>
            <div v-if="!readOnly" class="cost-actions">
              <button class="secondary-button" type="button" @click="openCostDialog(cost)">修改</button>
              <button class="secondary-button" type="button" @click="deletingCost = cost">刪除</button>
            </div>
          </article>
          <div class="cost-total">
            <span>成本小計</span>
            <strong>{{ formatMoney(totalCost) }}</strong>
          </div>
        </section>

        <section class="dialog-section">
          <h3>前測與後測</h3>
          <p v-if="!forms.length" class="form-hint">這個專案還沒有表單，請先在「專案表單」新增後，再選擇前測與後測。</p>
          <div class="dialog-grid dialog-grid--half">
            <label class="field">前測表單
              <select v-model="form.pre_form_id" :disabled="!forms.length">
                <option :value="null">不指定</option>
                <option
                  v-for="item in forms"
                  :key="item.form_id"
                  :value="item.form_id"
                  :disabled="item.form_id === form.post_form_id"
                >{{ item.title || "未命名表單" }}</option>
              </select>
            </label>
            <label class="field">後測表單
              <select v-model="form.post_form_id" :disabled="!forms.length">
                <option :value="null">不指定</option>
                <option
                  v-for="item in forms"
                  :key="item.form_id"
                  :value="item.form_id"
                  :disabled="item.form_id === form.pre_form_id"
                >{{ item.title || "未命名表單" }}</option>
              </select>
            </label>
          </div>
        </section>

        <section class="dialog-section">
          <label class="field">備註
            <textarea v-model="form.notes" rows="4" placeholder="其他補充說明"></textarea>
          </label>
        </section>
      </fieldset>

      <footer class="stakeholder-dialog__footer">
        <p v-if="error" class="stakeholder-dialog__error" role="alert">{{ error }}</p>
        <p v-else-if="!readOnly" class="stakeholder-dialog__hint">儲存後會先顯示在專案中，按「儲存專案」才會存入資料庫。</p>
        <button v-if="!readOnly" class="primary-button" type="button" @click="save">儲存</button>
      </footer>
    </div>

    <CostDialog :open="costDialogOpen" :cost="editingCost" @submit="submitCost" @cancel="closeCostDialog" />
    <ConfirmDialog
      :open="!!deletingCost"
      title="刪除成本"
      :message="`確定刪除「${deletingCost?.name ?? ''}」嗎？按「儲存專案」後才會生效。`"
      confirm-text="刪除"
      danger
      @confirm="confirmDeleteCost"
      @cancel="deletingCost = null"
    />
    <ConfirmDialog
      :open="discardDialogOpen"
      title="放棄修改"
      message="這次在視窗裡的修改還沒儲存，關閉後會遺失。確定要關閉嗎？"
      confirm-text="關閉"
      danger
      @confirm="confirmDiscard"
      @cancel="discardDialogOpen = false"
    />
  </div>
</template>

<style scoped>
/* 幾乎蓋滿整個畫面；z-index 要高於編輯頁凍結的標題列，低於 BaseModal（100） */
.stakeholder-dialog {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  padding: clamp(12px, 3vh, 32px) clamp(12px, 3vw, 40px);
  background: rgba(17, 17, 17, 0.45);
}

.stakeholder-dialog__panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-height: 0;
  border: 1px solid #111;
  background: #fff;
  color: #161616;
}

.stakeholder-dialog__header,
.stakeholder-dialog__footer {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 28px;
}

.stakeholder-dialog__header {
  justify-content: space-between;
  border-bottom: 2px solid #111;
}

.stakeholder-dialog__header h2 { margin: 0; font-size: 20px; letter-spacing: -0.03em; }

.stakeholder-dialog__close {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid #111;
  background: #fff;
  color: #111;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.stakeholder-dialog__close:hover { background: #111; color: #fff; }

.stakeholder-dialog__body {
  display: grid;
  align-content: start;
  gap: 28px;
  min-width: 0;
  margin: 0;
  padding: 24px 28px;
  border: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.stakeholder-dialog__footer {
  justify-content: flex-end;
  border-top: 1px solid #ddd;
}

.stakeholder-dialog__hint,
.stakeholder-dialog__error { margin: 0 auto 0 0; font-size: 14px; }
.stakeholder-dialog__hint { color: #666; }
.stakeholder-dialog__error { color: #8c2020; font-weight: 700; }

.dialog-section { display: grid; gap: 14px; padding-bottom: 24px; border-bottom: 1px solid #eee; }
.dialog-section:last-child { padding-bottom: 0; border-bottom: 0; }
.dialog-section h3 { margin: 0; font-size: 16px; }
.dialog-section p { margin: 0; }
.dialog-section__heading { display: flex; align-items: start; justify-content: space-between; gap: 20px; }
.dialog-section__heading p { margin-top: 6px; color: #666; font-size: 14px; line-height: 1.6; }

.dialog-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.field--wide { grid-column: 1 / -1; }

.field { display: grid; align-content: start; gap: 7px; color: #555; font-size: 14px; font-weight: 700; }
.field input, .field select, .field textarea { width: 100%; box-sizing: border-box; border: 1px solid #ccc; border-radius: 0; padding: 11px 12px; background: #fff; color: #111; font: inherit; font-size: 14px; font-weight: 400; outline: none; }
.field textarea { resize: vertical; }
.field input:focus, .field select:focus, .field textarea:focus { border-color: #111; }

.primary-button, .secondary-button { min-height: 40px; border: 1px solid #111; padding: 8px 14px; background: #fff; color: #111; font: inherit; font-size: 14px; font-weight: 750; cursor: pointer; white-space: nowrap; }
.primary-button { min-width: 120px; background: #111; color: #fff; }
button:disabled { cursor: not-allowed; opacity: 0.5; }

.empty-state { padding: 20px; background: #f7f7f7; color: #666; font-size: 14px; text-align: center; }
.form-hint { color: #7b647f; font-size: 14px; }

.outcome-composer { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; }
.outcome-composer input { min-width: 0; border: 1px solid #ccc; padding: 11px 12px; background: #fff; color: #111; font: inherit; font-size: 14px; outline: none; }
.outcome-composer input:focus { border-color: #765292; box-shadow: 0 0 0 2px #eee4f3; }
.outcome-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.outcome-tags button { display: inline-flex; align-items: center; gap: 7px; border: 0; border-radius: 999px; padding: 7px 10px 7px 12px; background: #f0e8f4; color: #6d4688; font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
.outcome-tags button b { display: grid; width: 17px; height: 17px; place-items: center; border-radius: 50%; background: #765292; color: #fff; font-size: 14px; line-height: 1; opacity: 0; transform: scale(0.7); transition: opacity 0.15s ease, transform 0.15s ease; }
.outcome-tags button:hover b, .outcome-tags button:focus-visible b { opacity: 1; transform: scale(1); }
.outcome-tags button:hover { background: #e8daee; }
.outcome-tags button:disabled { cursor: default; opacity: 1; }
.outcome-tags button:disabled b { display: none; }

.cost-row { display: grid; grid-template-columns: 32px 1.4fr 1fr 0.6fr 1fr 1.2fr auto; align-items: end; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid #eee; }
.row-number { align-self: center; color: #999; font-size: 14px; }
.cost-value { overflow: hidden; border: 1px solid #e3e3e3; padding: 11px 12px; background: #f7f7f7; color: #111; font-size: 14px; font-weight: 400; text-overflow: ellipsis; white-space: nowrap; }
.cost-actions { display: flex; gap: 8px; }
.cost-total { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 14px 16px; background: #111; color: #fff; }
.cost-total span { font-size: 14px; font-weight: 700; }
.cost-total strong { font-size: 18px; }

@media (max-width: 900px) {
  .dialog-grid, .cost-row { grid-template-columns: 1fr; }
  .row-number { display: none; }
}

@media (max-width: 600px) {
  .stakeholder-dialog { padding: 0; }
  .stakeholder-dialog__header, .stakeholder-dialog__footer, .stakeholder-dialog__body { padding-left: 18px; padding-right: 18px; }
  .dialog-section__heading, .stakeholder-dialog__footer { align-items: stretch; flex-direction: column; }
  .outcome-composer { grid-template-columns: 1fr; }
}
</style>
