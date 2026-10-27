<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import { getProjectSROI, saveProjectSROI } from "@/modules/workspace/api/workspace.api";
import type {
  OutcomeValuation,
  ProjectSROI,
  ProjectSROIPayload,
  StakeholderSROI
} from "@/modules/workspace/types/workspace.types";

const route = useRoute();
const projectId = computed(() => String(route.params.projectId ?? ""));
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const savedMessage = ref("");
const projectName = ref("");
const actualInputCost = ref(0);
const discountRatePercent = ref(3.5);
const stakeholders = ref<StakeholderSROI[]>([]);
const selectedStakeholderId = computed(() =>
  typeof route.query.stakeholder === "string" ? route.query.stakeholder : ""
);
const selectedStakeholder = computed(() =>
  stakeholders.value.find((stakeholder) => stakeholder.stakeholder_id === selectedStakeholderId.value) ?? null
);
const visibleStakeholders = computed(() =>
  selectedStakeholder.value ? [selectedStakeholder.value] : stakeholders.value
);

const finite = (value: number, fallback = 0): number => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, finite(value)));

const outcomeValue = (outcome: OutcomeValuation): number => {
  if (!outcome.is_included) return 0;
  const base = Math.max(0, finite(outcome.quantity))
    * Math.max(0, finite(outcome.financial_proxy_value))
    * (1 - clamp(outcome.deadweight_rate, 0, 1))
    * (1 - clamp(outcome.attribution_rate, 0, 1))
    * (1 - clamp(outcome.displacement_rate, 0, 1));
  const years = Math.round(clamp(outcome.duration_years, 1, 20));
  const dropoff = clamp(outcome.dropoff_rate, 0, 1);
  const discount = clamp(discountRatePercent.value / 100, 0, 1);
  let total = 0;
  for (let year = 0; year < years; year += 1) {
    total += base * ((1 - dropoff) ** year) / ((1 + discount) ** year);
  }
  return total;
};

const totalSocialValue = computed(() =>
  visibleStakeholders.value.reduce(
    (projectTotal, stakeholder) => projectTotal + stakeholder.outcomes.reduce(
      (stakeholderTotal, outcome) => stakeholderTotal + outcomeValue(outcome),
      0
    ),
    0
  )
);
const stakeholderMissingFinancialProxy = (stakeholder: StakeholderSROI): boolean =>
  stakeholder.outcomes.some((outcome) => outcome.is_included && finite(outcome.financial_proxy_value) <= 0);

const stakeholderSocialValue = (stakeholder: StakeholderSROI): number =>
  stakeholder.outcomes.reduce((total, outcome) => total + outcomeValue(outcome), 0);

const stakeholderRatio = (stakeholder: StakeholderSROI): number | null =>
  actualInputCost.value > 0 && !stakeholderMissingFinancialProxy(stakeholder)
    ? stakeholderSocialValue(stakeholder) / actualInputCost.value
    : null;

const missingFinancialProxy = computed(() => visibleStakeholders.value.some(stakeholderMissingFinancialProxy));
const sroiRatio = computed(() => {
  if (actualInputCost.value <= 0 || missingFinancialProxy.value || !visibleStakeholders.value.length) return null;
  return visibleStakeholders.value.reduce((total, stakeholder) => total + (stakeholderRatio(stakeholder) ?? 0), 0);
});

const formatMoney = (value: number): string => new Intl.NumberFormat("zh-TW", {
  style: "currency",
  currency: "TWD",
  maximumFractionDigits: 0
}).format(finite(value));

const hydrate = (data: ProjectSROI): void => {
  projectName.value = data.project_name;
  actualInputCost.value = Number(data.actual_input_cost);
  discountRatePercent.value = Number(data.discount_rate) * 100;
  stakeholders.value = data.stakeholders.map((stakeholder) => ({
    ...stakeholder,
    total_social_value: Number(stakeholder.total_social_value),
    sroi_ratio: stakeholder.sroi_ratio === null ? null : Number(stakeholder.sroi_ratio),
    outcomes: stakeholder.outcomes.map((outcome) => ({
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
  }));
};

const payload = (): ProjectSROIPayload => ({
  discount_rate: clamp(discountRatePercent.value / 100, 0, 1),
  stakeholders: stakeholders.value.map((stakeholder) => ({
    stakeholder_id: stakeholder.stakeholder_id,
    outcomes: stakeholder.outcomes.map((outcome) => ({
      outcome_id: outcome.outcome_id,
      quantity: Math.max(0, finite(outcome.quantity)),
      financial_proxy_value: Math.max(0, finite(outcome.financial_proxy_value)),
      deadweight_rate: clamp(outcome.deadweight_rate, 0, 1),
      attribution_rate: clamp(outcome.attribution_rate, 0, 1),
      displacement_rate: clamp(outcome.displacement_rate, 0, 1),
      duration_years: Math.round(clamp(outcome.duration_years, 1, 20)),
      dropoff_rate: clamp(outcome.dropoff_rate, 0, 1),
      is_included: outcome.is_included
    }))
  }))
});

const save = async (): Promise<void> => {
  saving.value = true;
  error.value = "";
  savedMessage.value = "";
  try {
    const saved = await saveProjectSROI(projectId.value, payload());
    hydrate(saved);
    savedMessage.value = "SROI 計算資料已儲存";
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "無法儲存 SROI 資料";
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  loading.value = true;
  try {
    hydrate(await getProjectSROI(projectId.value));
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "無法載入 SROI 資料";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="sroi-page">
    <header class="page-header">
      <div>
        <RouterLink class="back-link" :to="{ name: 'project-edit', params: { projectId } }">← 返回專案</RouterLink>
        <p class="eyebrow">SOCIAL RETURN ON INVESTMENT</p>
        <h1>{{ projectName || "SROI 計算" }}</h1>
      </div>
      <button class="primary-button" type="button" :disabled="loading || saving" @click="save">
        {{ saving ? "儲存中…" : "儲存 SROI" }}
      </button>
    </header>

    <p v-if="error" class="message message--error">{{ error }}</p>
    <p v-if="savedMessage" class="message message--success">{{ savedMessage }}</p>
    <p v-if="loading" class="state-card">正在載入 SROI 資料…</p>

    <template v-else>
      <section v-if="selectedStakeholder" class="view-context">
        <div>
          <span>目前查看利害關係人</span>
          <strong>{{ selectedStakeholder.stakeholder_name }}</strong>
        </div>
        <RouterLink :to="{ name: 'project-sroi', params: { projectId } }">查看專案全部 SROI</RouterLink>
      </section>

      <section class="summary-grid">
        <article class="summary-card summary-card--ratio">
          <span>{{ selectedStakeholder ? '此利害關係人 SROI' : '專案 SROI 比例' }}</span>
          <strong>{{ sroiRatio === null ? '—' : `${sroiRatio.toFixed(2)} : 1` }}</strong>
          <p v-if="sroiRatio !== null">每投入 1 元，暫估產生 {{ sroiRatio.toFixed(2) }} 元社會價值。</p>
          <p v-else-if="actualInputCost <= 0">請先在專案基本資料新增成本。</p>
          <p v-else-if="missingFinancialProxy">等待連接財務代理變數後才會計算。</p>
          <p v-else>尚無可採計的成果價值。</p>
        </article>
        <article class="summary-card">
          <span>成果總價值</span>
          <strong>{{ missingFinancialProxy ? '待連接代理變數' : formatMoney(totalSocialValue) }}</strong>
        </article>
        <article class="summary-card">
          <span>實際投入成本</span>
          <strong>{{ formatMoney(actualInputCost) }}</strong>
          <RouterLink class="cost-link" :to="{ name: 'project-edit', params: { projectId } }">到專案基本資料修改成本 →</RouterLink>
        </article>
        <label class="summary-card summary-card--input">
          <span>折現率（%）</span>
          <input v-model.number="discountRatePercent" type="number" min="0" max="100" step="0.1" />
        </label>
      </section>

      <section class="explanation">
        <strong>目前是暫估模型</strong>
        <p>每位利害關係人的 SROI＝該利害關係人成果價值 ÷ 專案投入成本；專案 SROI 為所有利害關係人 SROI 加總。財務代理變數將由共用資料庫選擇。</p>
      </section>

      <section v-if="visibleStakeholders.length" class="stakeholder-list">
        <article v-for="stakeholder in visibleStakeholders" :key="stakeholder.stakeholder_id" class="stakeholder-card">
          <header class="stakeholder-card__header">
            <div>
              <p class="eyebrow">利害關係人 {{ String(stakeholder.position + 1).padStart(2, "0") }}</p>
              <h2>{{ stakeholder.stakeholder_name }}</h2>
              <small>{{ stakeholder.stakeholder_role || '未設定類型' }}</small>
            </div>
            <div class="stakeholder-summary">
              <span>此利害關係人 SROI</span>
              <strong>{{ stakeholderRatio(stakeholder) === null ? '—' : `${stakeholderRatio(stakeholder)?.toFixed(2)} : 1` }}</strong>
              <small>成果價值 {{ formatMoney(stakeholderSocialValue(stakeholder)) }}</small>
            </div>
          </header>

          <section v-if="stakeholder.outcomes.length" class="outcome-list">
            <article v-for="outcome in stakeholder.outcomes" :key="outcome.outcome_id" class="outcome-card">
              <header>
                <div><p class="eyebrow">成果 {{ String(outcome.position + 1).padStart(2, "0") }}</p><h3>#{{ outcome.outcome_name }}</h3></div>
                <div class="outcome-status">
                  <span :class="['evidence-badge', outcome.suggested_eligible === true ? 'evidence-badge--eligible' : outcome.suggested_eligible === false ? 'evidence-badge--below' : '']">
                    {{ outcome.suggested_eligible === true ? `建議採計 · ${Math.round((outcome.scale_score ?? 0) * 100)}%` : outcome.suggested_eligible === false ? `未達暫定標準 · ${Math.round((outcome.scale_score ?? 0) * 100)}%` : '尚無量表資料' }}
                  </span>
                  <small>{{ outcome.scale_answer_count }} 筆量表回答</small>
                </div>
              </header>
              <label class="include-toggle"><input v-model="outcome.is_included" type="checkbox" /><span>納入 SROI 計算</span></label>
              <div class="valuation-grid" :class="{ 'valuation-grid--disabled': !outcome.is_included }">
                <label>採計數量<input v-model.number="outcome.quantity" type="number" min="0" step="1" /></label>
                <div class="proxy-field"><span>財務代理變數</span><strong>尚未連接</strong><small>待財務代理變數資料庫完成後，由此選擇。</small></div>
                <label>持續年數<input v-model.number="outcome.duration_years" type="number" min="1" max="20" step="1" /></label>
              </div>
              <fieldset class="sensitivity-panel" :disabled="!outcome.is_included">
                <legend>調整係數設定（敏感度分析）</legend>
                <p>輸入 0–100%，系統會立即試算調整後的成果價值。</p>
                <div class="sensitivity-grid">
                  <label>Deadweight（淨損）<input :value="outcome.deadweight_rate * 100" type="number" min="0" max="100" step="0.1" @input="outcome.deadweight_rate = clamp(Number(($event.target as HTMLInputElement).value) / 100, 0, 1)" /><small>%</small></label>
                  <label>Attribution（歸因）<input :value="outcome.attribution_rate * 100" type="number" min="0" max="100" step="0.1" @input="outcome.attribution_rate = clamp(Number(($event.target as HTMLInputElement).value) / 100, 0, 1)" /><small>%</small></label>
                  <label>Displacement（移轉）<input :value="outcome.displacement_rate * 100" type="number" min="0" max="100" step="0.1" @input="outcome.displacement_rate = clamp(Number(($event.target as HTMLInputElement).value) / 100, 0, 1)" /><small>%</small></label>
                  <label>Drop-off（衰減）<input :value="outcome.dropoff_rate * 100" type="number" min="0" max="100" step="0.1" @input="outcome.dropoff_rate = clamp(Number(($event.target as HTMLInputElement).value) / 100, 0, 1)" /><small>%</small></label>
                </div>
              </fieldset>
              <footer><span>這項成果暫估價值</span><strong>{{ outcome.is_included && outcome.financial_proxy_value <= 0 ? '等待財務代理變數' : formatMoney(outcomeValue(outcome)) }}</strong></footer>
            </article>
          </section>
          <p v-else class="state-card">此專案尚未建立成果初列，請先回到專案頁新增成果 hashtag。</p>
        </article>
      </section>

      <section v-else class="state-card empty-state">
        <h2>尚未設定利害關係人</h2>
        <p>請先回到專案頁新增利害關係人，再進行個別 SROI 計算。</p>
      </section>
    </template>
  </section>
</template>

<style scoped>
.sroi-page { display: grid; gap: 24px; color: #17131a; }
.page-header { display: flex; align-items: end; justify-content: space-between; gap: 24px; padding-bottom: 22px; border-bottom: 2px solid #211827; }
.back-link { display: inline-block; margin-bottom: 22px; color: #675d6c; font-size: 12px; text-decoration: none; }
.eyebrow { margin: 0 0 7px; color: #765292; font-size: 10px; font-weight: 800; letter-spacing: .14em; }
h1, h2, h3, p { margin: 0; }
h1 { font-size: clamp(30px, 4vw, 48px); letter-spacing: -.05em; }
h2 { font-size: 20px; }
h3 { font-size: 17px; }
.primary-button { min-height: 42px; border: 1px solid #68447f; padding: 9px 18px; background: #765292; color: #fff; font: inherit; font-size: 12px; font-weight: 800; cursor: pointer; }
.primary-button:disabled { cursor: not-allowed; opacity: .55; }
.message, .state-card { padding: 14px 16px; border: 1px solid #d5cdd8; background: #fff; }
.message--error { border-color: #bd7676; color: #8c2020; }
.message--success { border-color: #87aa8c; color: #286133; }
.view-context { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 15px 18px; border-left: 4px solid #765292; background: #f7f1f9; }
.view-context div { display: grid; gap: 4px; }
.view-context span { color: #756b79; font-size: 10px; }
.view-context strong { color: #34263b; font-size: 16px; }
.view-context a { color: #68447f; font-size: 11px; font-weight: 750; text-decoration: none; }
.summary-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 14px; }
.summary-card { display: grid; align-content: space-between; min-height: 128px; gap: 10px; padding: 20px; border: 1px solid #ded4e2; background: #fff; }
.summary-card span { color: #746b78; font-size: 11px; font-weight: 750; }
.summary-card strong { font-size: clamp(22px, 3vw, 34px); letter-spacing: -.04em; }
.summary-card p { color: #655b69; font-size: 11px; line-height: 1.6; }
.summary-card--ratio { background: #765292; color: #fff; }
.summary-card--ratio span, .summary-card--ratio p { color: #f0e7f4; }
.summary-card--input input { width: 100%; border: 0; border-bottom: 1px solid #8f8295; padding: 8px 0; background: transparent; color: #211827; font: inherit; font-size: 20px; font-weight: 700; outline: none; }
.cost-link { color: #765292; font-size: 11px; font-weight: 750; text-decoration: none; }
.explanation { display: grid; grid-template-columns: 180px 1fr; gap: 22px; padding: 17px 20px; border-left: 4px solid #a77bbd; background: #f7f1f9; }
.explanation strong { font-size: 12px; }
.explanation p { color: #675d6c; font-size: 12px; line-height: 1.7; }
.stakeholder-list { display: grid; gap: 22px; }
.stakeholder-card { display: grid; gap: 18px; padding: 24px; border: 1px solid #cfc0d7; background: #f8f3fa; }
.stakeholder-card__header { display: flex; align-items: start; justify-content: space-between; gap: 20px; }
.stakeholder-card__header small { color: #817787; font-size: 10px; }
.stakeholder-summary { display: grid; justify-items: end; gap: 4px; }
.stakeholder-summary span, .stakeholder-summary small { color: #756b79; font-size: 10px; }
.stakeholder-summary strong { color: #68447f; font-size: 25px; }
.outcome-list { display: grid; gap: 18px; }
.outcome-card { display: grid; gap: 20px; padding: 24px; border: 1px solid #d8cedd; background: #fff; }
.outcome-card > header { display: flex; align-items: start; justify-content: space-between; gap: 20px; padding-bottom: 17px; border-bottom: 1px solid #e4dde7; }
.outcome-status { display: grid; justify-items: end; gap: 5px; }
.outcome-status small { color: #817787; font-size: 10px; }
.evidence-badge { padding: 5px 9px; border-radius: 999px; background: #f0edf1; color: #736d76; font-size: 10px; font-weight: 750; }
.evidence-badge--eligible { background: #e5f3e8; color: #2f7140; }
.evidence-badge--below { background: #f7e9e7; color: #9a4338; }
.include-toggle { display: flex; align-items: center; gap: 8px; width: fit-content; font-size: 12px; font-weight: 750; cursor: pointer; }
.include-toggle input { accent-color: #765292; }
.valuation-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 15px; transition: opacity .15s ease; }
.valuation-grid--disabled { pointer-events: none; opacity: .4; }
.valuation-grid label, .sensitivity-grid label { display: grid; gap: 7px; color: #675d6c; font-size: 10px; font-weight: 750; }
.valuation-grid input, .sensitivity-grid input { width: 100%; min-width: 0; border: 1px solid #cfc4d3; padding: 10px; background: #fff; color: #211827; font: inherit; font-size: 12px; outline: none; }
.valuation-grid input:focus, .sensitivity-grid input:focus { border-color: #765292; box-shadow: 0 0 0 2px #eee4f3; }
.proxy-field { display: grid; align-content: center; gap: 5px; min-height: 64px; border: 1px dashed #bcaec2; padding: 9px 10px; background: #faf7fb; }
.proxy-field span { color: #675d6c; font-size: 10px; font-weight: 750; }
.proxy-field strong { color: #765292; font-size: 12px; }
.proxy-field small { color: #8b818f; font-size: 9px; line-height: 1.4; }
.sensitivity-panel { display: grid; gap: 12px; margin: 0; border: 1px solid #d8cedd; padding: 16px; background: #faf7fb; transition: opacity .15s ease; }
.sensitivity-panel:disabled { opacity: .4; }
.sensitivity-panel legend { padding: 0 8px; color: #68447f; font-size: 12px; font-weight: 800; }
.sensitivity-panel > p { color: #817787; font-size: 10px; line-height: 1.5; }
.sensitivity-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.sensitivity-grid label { position: relative; }
.sensitivity-grid label small { position: absolute; right: 10px; bottom: 11px; color: #8b818f; font-size: 10px; }
.sensitivity-grid input { padding-right: 27px; }
.outcome-card footer { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding-top: 16px; border-top: 1px solid #e4dde7; }
.outcome-card footer span { color: #675d6c; font-size: 11px; }
.outcome-card footer strong { color: #68447f; font-size: 22px; }
.empty-state { display: grid; justify-items: center; gap: 9px; padding: 48px; text-align: center; }
.empty-state p { color: #675d6c; font-size: 12px; }
@media (max-width: 1050px) { .summary-grid { grid-template-columns: repeat(2, 1fr); } .valuation-grid, .sensitivity-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 650px) { .page-header, .view-context, .stakeholder-card__header, .outcome-card > header, .outcome-card footer { align-items: stretch; flex-direction: column; } .summary-grid, .valuation-grid, .sensitivity-grid, .explanation { grid-template-columns: 1fr; } .outcome-status, .stakeholder-summary { justify-items: start; } }
</style>
