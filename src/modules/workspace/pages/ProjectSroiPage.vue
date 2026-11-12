<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import {
  getFinancialProxyOptions,
  type FinancialProxy
} from "@/modules/proxy-variables/api/financialProxy.api";
import {
  getProject,
  getStakeholderSROI,
  saveStakeholderSROI
} from "@/modules/workspace/api/workspace.api";
import ConfirmDialog from "@/modules/workspace/components/ConfirmDialog.vue";
import { isProjectPhaseTab } from "@/modules/workspace/composables/useProjectPhaseTab";
import { toProjectErrorMessage } from "@/modules/workspace/constants";
import { useProjectStore } from "@/modules/workspace/store/project.store";
import type {
  GroupRole,
  OutcomeValuation,
  StakeholderSROI,
  StakeholderSROIPayload
} from "@/modules/workspace/types/workspace.types";
import { useUnsavedChanges } from "@/shared/composables/useUnsavedChanges";

const route = useRoute();
const projectStore = useProjectStore();
const projectId = computed(() => String(route.params.projectId ?? ""));
const stakeholderId = computed(() => String(route.params.stakeholderId ?? ""));
const phaseQuery = computed(() => (isProjectPhaseTab(route.query.phase) ? { phase: route.query.phase } : {}));
const projectEditLink = computed(() => ({
  name: "project-edit",
  params: { projectId: projectId.value },
  query: { ...phaseQuery.value, tab: "stakeholders" }
}));
const loadFailed = ref(false);
const backLink = computed(() =>
  loadFailed.value ? { name: "my-projects", query: phaseQuery.value } : projectEditLink.value
);
const myRole = ref<GroupRole>("leader");
const readOnly = computed(() => myRole.value === "viewer");
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const savedMessage = ref("");
const stakeholder = ref<StakeholderSROI | null>(null);
const financialProxies = ref<FinancialProxy[]>([]);
const savedSnapshot = ref("");

const finite = (value: number, fallback = 0): number =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, finite(value)));
const discountRatePercent = computed({
  get: () => Math.round(finite(stakeholder.value?.discount_rate ?? 0.035) * 10000) / 100,
  set: (value: number) => {
    if (stakeholder.value) stakeholder.value.discount_rate = clamp(value / 100, 0, 1);
  }
});

const proxyById = computed(() =>
  new Map(financialProxies.value.map((proxy) => [proxy.proxy_id, proxy]))
);

const applyFinancialProxy = (outcome: OutcomeValuation): void => {
  const proxy = outcome.financial_proxy_id
    ? proxyById.value.get(outcome.financial_proxy_id)
    : undefined;
  outcome.financial_proxy_name = proxy?.name ?? null;
  outcome.financial_proxy_note = proxy?.note ?? null;
  outcome.financial_proxy_value = proxy ? Number(proxy.value) : 0;
};

const outcomeValue = (outcome: OutcomeValuation): number => {
  if (!outcome.is_included) return 0;
  const base = Math.max(0, finite(outcome.quantity))
    * Math.max(0, finite(outcome.financial_proxy_value))
    * (1 - clamp(outcome.deadweight_rate, 0, 1))
    * (1 - clamp(outcome.attribution_rate, 0, 1))
    * (1 - clamp(outcome.displacement_rate, 0, 1));
  const years = Math.round(clamp(outcome.duration_years, 1, 20));
  const dropoff = clamp(outcome.dropoff_rate, 0, 1);
  const discount = clamp(stakeholder.value?.discount_rate ?? 0.035, 0, 1);
  let total = 0;
  for (let year = 0; year < years; year += 1) {
    total += base * ((1 - dropoff) ** year) / ((1 + discount) ** year);
  }
  return total;
};

const totalSocialValue = computed(() =>
  stakeholder.value?.outcomes.reduce((total, outcome) => total + outcomeValue(outcome), 0) ?? 0
);
const missingFinancialProxy = computed(() =>
  stakeholder.value?.outcomes.some(
    (outcome) => outcome.is_included && !outcome.financial_proxy_id
  ) ?? false
);
const sroiRatio = computed(() => {
  if (!stakeholder.value || stakeholder.value.input_cost <= 0 || missingFinancialProxy.value) return null;
  return totalSocialValue.value / stakeholder.value.input_cost;
});

const formatMoney = (value: number): string =>
  `${Math.round(finite(value)).toLocaleString("zh-TW")} 元`;

const payload = (): StakeholderSROIPayload => ({
  discount_rate: clamp(stakeholder.value?.discount_rate ?? 0.035, 0, 1),
  outcomes: (stakeholder.value?.outcomes ?? []).map((outcome) => ({
    outcome_id: outcome.outcome_id,
    quantity: Math.max(0, finite(outcome.quantity)),
    financial_proxy_id: outcome.financial_proxy_id || null,
    deadweight_rate: clamp(outcome.deadweight_rate, 0, 1),
    attribution_rate: clamp(outcome.attribution_rate, 0, 1),
    displacement_rate: clamp(outcome.displacement_rate, 0, 1),
    duration_years: Math.round(clamp(outcome.duration_years, 1, 20)),
    dropoff_rate: clamp(outcome.dropoff_rate, 0, 1),
    is_included: outcome.is_included
  }))
});

const snapshot = (): string => JSON.stringify(payload());
const hydrate = (data: StakeholderSROI): void => {
  stakeholder.value = {
    ...data,
    input_cost: Number(data.input_cost),
    discount_rate: Number(data.discount_rate),
    total_social_value: Number(data.total_social_value),
    sroi_ratio: data.sroi_ratio === null ? null : Number(data.sroi_ratio),
    outcomes: data.outcomes.map((outcome) => ({
      ...outcome,
      quantity: Number(outcome.quantity),
      financial_proxy_value: Number(outcome.financial_proxy_value),
      deadweight_rate: Number(outcome.deadweight_rate),
      attribution_rate: Number(outcome.attribution_rate),
      displacement_rate: Number(outcome.displacement_rate),
      duration_years: Number(outcome.duration_years),
      dropoff_rate: Number(outcome.dropoff_rate),
      scale_score: outcome.scale_score === null ? null : Number(outcome.scale_score),
      calculated_value: Number(outcome.calculated_value)
    }))
  };
  savedSnapshot.value = snapshot();
};

const isDirty = computed(() =>
  !loadFailed.value && !readOnly.value && !loading.value && snapshot() !== savedSnapshot.value
);
const { leaveDialogOpen, answerLeave } = useUnsavedChanges(isDirty);

const save = async (): Promise<void> => {
  if (readOnly.value || !stakeholder.value) return;
  saving.value = true;
  error.value = "";
  savedMessage.value = "";
  try {
    const saved = await saveStakeholderSROI(projectId.value, stakeholderId.value, payload());
    hydrate(saved);
    savedMessage.value = `「${saved.stakeholder_name}」的 SROI 資料已儲存`;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "無法儲存 SROI 資料";
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  loading.value = true;
  try {
    const cached = projectStore.projects.find((item) => item.project_id === projectId.value);
    const [sroi, project, proxies] = await Promise.all([
      getStakeholderSROI(projectId.value, stakeholderId.value),
      cached ? Promise.resolve(cached) : getProject(projectId.value),
      getFinancialProxyOptions()
    ]);
    myRole.value = project.my_role ?? "leader";
    financialProxies.value = proxies.map((proxy) => ({ ...proxy, value: Number(proxy.value) }));
    hydrate(sroi);
  } catch (caught) {
    error.value = toProjectErrorMessage(caught, "無法載入此利害關係人的 SROI 資料");
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="sroi-page">
    <header class="page-header">
      <div>
        <RouterLink class="back-link" :to="backLink">{{ loadFailed ? "← 返回我的專案" : "← 返回利害關係人" }}</RouterLink>
        <p class="eyebrow">利害關係人 SROI</p>
        <h1>{{ stakeholder ? `${stakeholder.stakeholder_name}・SROI 計算` : "SROI 計算" }}</h1>
        <p v-if="stakeholder" class="project-name">{{ stakeholder.project_name }}</p>
      </div>
      <div v-if="!loadFailed" class="page-header__actions">
        <span v-if="isDirty" class="dirty-hint">有未儲存的修改</span>
        <button v-if="!readOnly" class="primary-button" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? "儲存中…" : "儲存這位利害關係人的 SROI" }}
        </button>
      </div>
    </header>

    <ConfirmDialog
      :open="leaveDialogOpen"
      title="尚未儲存"
      message="SROI 資料有修改還沒儲存，離開後會遺失。確定要離開嗎？"
      confirm-text="離開"
      danger
      @confirm="answerLeave(true)"
      @cancel="answerLeave(false)"
    />

    <p v-if="error" class="message message--error">{{ error }}</p>
    <p v-if="savedMessage" class="message message--success">{{ savedMessage }}</p>
    <p v-if="loading" class="state-card">正在載入 SROI 資料…</p>

    <template v-else-if="stakeholder && !loadFailed">
      <p v-if="readOnly" class="message">你在這個群組是檢視者，只能查看 SROI 計算結果。</p>
      <fieldset class="plain-fieldset" :disabled="readOnly">
        <section class="summary-grid">
          <article class="summary-card summary-card--ratio">
            <span>{{ stakeholder.stakeholder_name }} 的 SROI</span>
            <strong>{{ sroiRatio === null ? "—" : `${sroiRatio.toFixed(2)} : 1` }}</strong>
            <p v-if="sroiRatio !== null">每投入 1 元，暫估產生 {{ sroiRatio.toFixed(2) }} 元社會價值。</p>
            <p v-else-if="stakeholder.input_cost <= 0">請先在此利害關係人中新增成本。</p>
            <p v-else-if="missingFinancialProxy">請先為每項納入的成果選擇財務代理變數。</p>
            <p v-else>尚無可採計的成果價值。</p>
          </article>
          <article class="summary-card">
            <span>成果總價值</span>
            <strong>{{ missingFinancialProxy ? "待選擇代理變數" : formatMoney(totalSocialValue) }}</strong>
          </article>
          <article class="summary-card">
            <span>此利害關係人的投入成本</span>
            <strong>{{ formatMoney(stakeholder.input_cost) }}</strong>
            <RouterLink v-if="!readOnly" class="cost-link" :to="projectEditLink">回利害關係人修改成本 →</RouterLink>
          </article>
          <label class="summary-card summary-card--input">
            <span>折現率（%）</span>
            <input v-model.number="discountRatePercent" type="number" min="0" max="100" step="0.1" />
          </label>
        </section>

        <section class="explanation">
          <strong>單一利害關係人計算</strong>
          <p>SROI＝此利害關係人的成果總價值 ÷ 此利害關係人的投入成本。這裡只會載入與儲存「{{ stakeholder.stakeholder_name }}」的資料。</p>
        </section>

        <section v-if="stakeholder.outcomes.length" class="outcome-list">
          <article v-for="outcome in stakeholder.outcomes" :key="outcome.outcome_id" class="outcome-card">
            <header>
              <div>
                <p class="eyebrow">成果 {{ String(outcome.position + 1).padStart(2, "0") }}</p>
                <h2>#{{ outcome.outcome_name }}</h2>
              </div>
              <div class="outcome-status">
                <span :class="['evidence-badge', outcome.suggested_eligible === true ? 'evidence-badge--eligible' : outcome.suggested_eligible === false ? 'evidence-badge--below' : '']">
                  {{ outcome.suggested_eligible === true ? `建議採計 · ${Math.round((outcome.scale_score ?? 0) * 100)}%` : outcome.suggested_eligible === false ? `未達暫定標準 · ${Math.round((outcome.scale_score ?? 0) * 100)}%` : "尚無量表資料" }}
                </span>
                <small>{{ outcome.scale_answer_count }} 筆量表回答</small>
              </div>
            </header>
            <label class="include-toggle"><input v-model="outcome.is_included" type="checkbox" /><span>納入 SROI 計算</span></label>
            <div class="valuation-grid" :class="{ 'valuation-grid--disabled': !outcome.is_included }">
              <label>採計數量<input v-model.number="outcome.quantity" type="number" min="0" step="1" /></label>
              <label class="proxy-field">
                財務代理變數
                <select v-model="outcome.financial_proxy_id" @change="applyFinancialProxy(outcome)">
                  <option :value="null">請選擇財務代理變數</option>
                  <option v-for="proxy in financialProxies" :key="proxy.proxy_id" :value="proxy.proxy_id">
                    {{ proxy.name }}・{{ formatMoney(proxy.value) }}
                  </option>
                </select>
                <small v-if="outcome.financial_proxy_id">
                  {{ formatMoney(outcome.financial_proxy_value) }}<template v-if="outcome.financial_proxy_note">・{{ outcome.financial_proxy_note }}</template>
                </small>
                <small v-else>金額由財務代理變數資料庫帶入，不另外手動輸入。</small>
              </label>
              <label>持續年數<input v-model.number="outcome.duration_years" type="number" min="1" max="20" step="1" /></label>
            </div>
            <fieldset class="sensitivity-panel" :disabled="!outcome.is_included">
              <legend>調整係數設定（敏感度分析）</legend>
              <p>輸入 0–100%，系統會立即試算調整後的成果價值。</p>
              <div class="sensitivity-grid">
                <label>淨損<input :value="outcome.deadweight_rate * 100" type="number" min="0" max="100" step="0.1" @input="outcome.deadweight_rate = clamp(Number(($event.target as HTMLInputElement).value) / 100, 0, 1)" /><small>%</small></label>
                <label>歸因<input :value="outcome.attribution_rate * 100" type="number" min="0" max="100" step="0.1" @input="outcome.attribution_rate = clamp(Number(($event.target as HTMLInputElement).value) / 100, 0, 1)" /><small>%</small></label>
                <label>移轉<input :value="outcome.displacement_rate * 100" type="number" min="0" max="100" step="0.1" @input="outcome.displacement_rate = clamp(Number(($event.target as HTMLInputElement).value) / 100, 0, 1)" /><small>%</small></label>
                <label>衰減<input :value="outcome.dropoff_rate * 100" type="number" min="0" max="100" step="0.1" @input="outcome.dropoff_rate = clamp(Number(($event.target as HTMLInputElement).value) / 100, 0, 1)" /><small>%</small></label>
              </div>
            </fieldset>
            <footer>
              <span>這項成果暫估價值</span>
              <strong>{{ outcome.is_included && !outcome.financial_proxy_id ? "待選擇財務代理變數" : formatMoney(outcomeValue(outcome)) }}</strong>
            </footer>
          </article>
        </section>
        <section v-else class="state-card empty-state">
          <h2>尚未初列成果</h2>
          <p>請先回到利害關係人編輯成果，再進行 SROI 計算。</p>
        </section>
      </fieldset>
    </template>
  </section>
</template>

<style scoped>
.plain-fieldset { display: contents; min-width: 0; margin: 0; padding: 0; border: 0; }
.sroi-page { display: grid; gap: 24px; color: #111; }
.page-header { display: flex; align-items: end; justify-content: space-between; gap: 24px; padding-bottom: 22px; border-bottom: 2px solid #111; }
.page-header__actions { display: flex; align-items: center; gap: 10px; }
.back-link { display: inline-block; margin-bottom: 22px; color: #555; font-size: 14px; text-decoration: none; }
.eyebrow { margin: 0 0 7px; color: #111; font-size: 14px; font-weight: 800; letter-spacing: .14em; }
.project-name { margin: 8px 0 0; color: #666; font-size: 14px; }
h1, h2, p { margin: 0; }
h1 { font-size: 24px; letter-spacing: -.05em; }
h2 { font-size: 18px; }
.dirty-hint { color: #444; font-size: 14px; font-weight: 700; }
.primary-button { min-height: 42px; border: 1px solid #111; padding: 9px 18px; background: #111; color: #fff; font: inherit; font-size: 14px; font-weight: 800; cursor: pointer; }
.primary-button:disabled { cursor: not-allowed; opacity: .55; }
.message, .state-card { padding: 14px 16px; border: 1px solid #bbb; background: #fff; }
.message--error { border-color: #333; color: #111; }
.message--success { border-color: #777; color: #222; }
.summary-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 14px; }
.summary-card { display: grid; align-content: space-between; min-height: 128px; gap: 10px; padding: 20px; border: 1px solid #ccc; background: #fff; }
.summary-card span { color: #555; font-size: 14px; font-weight: 750; }
.summary-card strong { font-size: 24px; letter-spacing: -.04em; }
.summary-card p { color: #555; font-size: 14px; line-height: 1.6; }
.summary-card--ratio { background: #111; color: #fff; }
.summary-card--ratio span, .summary-card--ratio p { color: #eee; }
.summary-card--input input { width: 100%; border: 0; border-bottom: 1px solid #777; padding: 8px 0; background: transparent; color: #111; font: inherit; font-size: 18px; font-weight: 700; outline: none; }
.cost-link { color: #111; font-size: 14px; font-weight: 750; text-decoration: underline; text-underline-offset: 3px; }
.explanation { display: grid; grid-template-columns: 220px 1fr; gap: 22px; padding: 17px 20px; border-left: 4px solid #111; background: #f4f4f4; }
.explanation strong { font-size: 14px; }
.explanation p { color: #555; font-size: 14px; line-height: 1.7; }
.outcome-list { display: grid; gap: 18px; }
.outcome-card { display: grid; gap: 20px; padding: 24px; border: 1px solid #ccc; background: #fff; }
.outcome-card > header { display: flex; align-items: start; justify-content: space-between; gap: 20px; padding-bottom: 17px; border-bottom: 1px solid #ddd; }
.outcome-status { display: grid; justify-items: end; gap: 5px; }
.outcome-status small { color: #666; font-size: 14px; }
.evidence-badge { padding: 5px 9px; border-radius: 999px; background: #eee; color: #555; font-size: 14px; font-weight: 750; }
.evidence-badge--eligible { background: #222; color: #fff; }
.evidence-badge--below { border: 1px solid #888; background: #fff; color: #333; }
.include-toggle { display: flex; align-items: center; gap: 8px; width: fit-content; font-size: 14px; font-weight: 750; cursor: pointer; }
.include-toggle input { accent-color: #111; }
.valuation-grid { display: grid; grid-template-columns: 1fr 1.6fr 1fr; gap: 15px; transition: opacity .15s ease; }
.valuation-grid--disabled { pointer-events: none; opacity: .4; }
.valuation-grid label, .sensitivity-grid label { display: grid; gap: 7px; color: #444; font-size: 14px; font-weight: 750; }
.valuation-grid input, .valuation-grid select, .sensitivity-grid input { width: 100%; min-width: 0; border: 1px solid #bbb; padding: 10px; background: #fff; color: #111; font: inherit; font-size: 14px; outline: none; }
.valuation-grid input:focus, .valuation-grid select:focus, .sensitivity-grid input:focus { border-color: #111; box-shadow: 0 0 0 2px #ddd; }
.proxy-field small { color: #666; font-weight: 400; line-height: 1.5; }
.sensitivity-panel { display: grid; gap: 12px; margin: 0; border: 1px solid #ccc; padding: 16px; background: #f7f7f7; transition: opacity .15s ease; }
.sensitivity-panel:disabled { opacity: .4; }
.sensitivity-panel legend { padding: 0 8px; color: #111; font-size: 14px; font-weight: 800; }
.sensitivity-panel > p { color: #666; font-size: 14px; line-height: 1.5; }
.sensitivity-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.sensitivity-grid label { position: relative; }
.sensitivity-grid label small { position: absolute; right: 10px; bottom: 11px; color: #666; font-size: 14px; }
.sensitivity-grid input { padding-right: 27px; }
.outcome-card footer { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding-top: 16px; border-top: 1px solid #ddd; }
.outcome-card footer span { color: #555; font-size: 14px; }
.outcome-card footer strong { color: #111; font-size: 18px; }
.empty-state { display: grid; justify-items: center; gap: 9px; padding: 48px; text-align: center; }
.empty-state p { color: #555; font-size: 14px; }
@media (max-width: 1050px) { .summary-grid { grid-template-columns: repeat(2, 1fr); } .valuation-grid, .sensitivity-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 650px) { .page-header, .outcome-card > header, .outcome-card footer { align-items: stretch; flex-direction: column; } .summary-grid, .valuation-grid, .sensitivity-grid, .explanation { grid-template-columns: 1fr; } .outcome-status { justify-items: start; } }
</style>
