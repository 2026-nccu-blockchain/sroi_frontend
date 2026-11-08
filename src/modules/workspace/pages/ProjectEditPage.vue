<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  downloadProjectInterviewFile,
  getProject,
  uploadTempInterviewFile
} from "@/modules/workspace/api/workspace.api";
import ConfirmDialog from "@/modules/workspace/components/ConfirmDialog.vue";
import CostDialog from "@/modules/workspace/components/CostDialog.vue";
import { useVerifiedGroups } from "@/modules/workspace/composables/useVerifiedGroups";
import { toProjectErrorMessage } from "@/modules/workspace/constants";
import { useProjectStore } from "@/modules/workspace/store/project.store";
import type {
  Group,
  GroupRole,
  LinkedProjectForm,
  ProjectCostPayload,
  ProjectPayload,
  ProjectStakeholder,
  WorkspaceProject
} from "@/modules/workspace/types/workspace.types";
import DateInput from "@/shared/components/DateInput.vue";
import { useUnsavedChanges } from "@/shared/composables/useUnsavedChanges";
import { monthEndIso, monthStartIso, toMonthValue } from "@/shared/utils/date";

// 所有內容（含成本、訪綱）都先改在畫面上，按「儲存專案」才一次存入
// key：已儲存的用後端 id，新增的用 new-n，讓尚未儲存的項目也能互相對應
type DraftStakeholder = Omit<ProjectStakeholder, "position"> & { key: string };
type DraftCost = ProjectCostPayload & { key: string };

interface DraftInterviewFile {
  key: string;
  stakeholderKey: string;
  original_name: string;
  size_bytes: number;
  // 已儲存的檔案
  file_id?: string;
  // 已上傳到暫存資料夾、還沒儲存的檔案；下載時直接用本機的 file
  temp_file_id?: string;
  file?: File;
}

let newKeySeed = 0;
const newKey = (): string => `new-${++newKeySeed}`;

const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();
const projectId = computed(() => typeof route.params.projectId === "string" ? route.params.projectId : "");
const isNew = computed(() => !projectId.value);
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const savedMessage = ref("");
const uploadingInterviewFile = ref(false);
const interviewFiles = ref<DraftInterviewFile[]>([]);
const projectForms = ref<LinkedProjectForm[]>([]);
const newOutcomeName = ref("");
const selectedStakeholderKey = ref("");
const currentYear = new Date().getFullYear();
const beginMonth = ref(`${currentYear}-01`);
const endMonth = ref(`${currentYear}-12`);
const costs = ref<DraftCost[]>([]);
const costDialogOpen = ref(false);
const editingCost = ref<DraftCost | null>(null);
const deletingCost = ref<DraftCost | null>(null);
// 最後一次儲存（或載入）時的內容，用來判斷有沒有未儲存的修改
const savedSnapshot = ref("");

// 專案位置：null 是個人專案。新增時可選擇，入口網址 ?group= 帶入預設群組，建立後不能移動
const { load: loadGroups, loadCreatable, titleOf } = useVerifiedGroups();
const creatableGroups = ref<Group[]>([]);
const ownerGroupId = ref<string | null>(null);
const myRole = ref<GroupRole>("leader");
const readOnly = computed(() => myRole.value === "viewer");
const backTo = computed(() =>
  ownerGroupId.value ? { name: "group-detail", params: { groupId: ownerGroupId.value } } : { name: "my-projects" }
);
// 編輯時只有群組專案顯示所屬群組
const ownerLabel = computed(() => `群組・${titleOf(ownerGroupId.value)}`);

const draft = reactive<Omit<ProjectPayload, "begin" | "end" | "stakeholders" | "costs"> & { stakeholders: DraftStakeholder[] }>({
  name: "",
  organization: "",
  description: "",
  status: "draft",
  stakeholders: [],
  outcomes: []
});

// 沒填名稱的利害關係人儲存時會被略過，所以不能上傳檔案
const namedStakeholders = computed(() => draft.stakeholders.filter((item) => item.name.trim()));

const filesOf = (stakeholderKey: string): DraftInterviewFile[] =>
  interviewFiles.value.filter((file) => file.stakeholderKey === stakeholderKey);

// 下拉選單選到的利害關係人，同時決定顯示誰的檔案與上傳給誰
const selectedFiles = computed(() => filesOf(selectedStakeholderKey.value));

const selectFallbackStakeholder = (): void => {
  if (!namedStakeholders.value.some((item) => item.key === selectedStakeholderKey.value)) {
    selectedStakeholderKey.value = namedStakeholders.value[0]?.key ?? "";
  }
};

// 新增、填名稱或移除利害關係人後，選到的人不在清單裡就改選第一位
watch(() => namedStakeholders.value.map((item) => item.key).join(), selectFallbackStakeholder);

// 總成本儲存前先在畫面上試算，儲存後的值以後端加總為準
const totalCost = computed(() =>
  costs.value.reduce((total, cost) => total + Number(cost.price) * Number(cost.quantity), 0)
);

const hydrate = (project: WorkspaceProject): void => {
  draft.name = project.name;
  draft.organization = project.organization;
  draft.description = project.description;
  costs.value = (project.costs ?? []).map((cost) => ({
    key: cost.cost_id,
    cost_id: cost.cost_id,
    name: cost.name,
    price: Number(cost.price),
    quantity: Number(cost.quantity),
    funding_source: cost.funding_source
  }));
  beginMonth.value = toMonthValue(project.begin);
  endMonth.value = toMonthValue(project.end);
  draft.status = project.status;
  draft.stakeholders = project.stakeholders.map(({ stakeholder_id, name, role, notes, pre_form_id, post_form_id }) => ({
    key: stakeholder_id ?? newKey(),
    stakeholder_id,
    name,
    role,
    notes,
    pre_form_id: pre_form_id ?? null,
    post_form_id: post_form_id ?? null
  }));
  draft.outcomes = project.outcomes.map(({ outcome_id, name }) => ({ outcome_id, name }));
  interviewFiles.value = (project.interview_files ?? []).map((file) => ({
    key: file.file_id,
    stakeholderKey: file.stakeholder_id,
    original_name: file.original_name,
    size_bytes: file.size_bytes,
    file_id: file.file_id
  }));
  projectForms.value = project.forms ?? [];
  selectFallbackStakeholder();
  ownerGroupId.value = project.group_id;
  myRole.value = project.my_role ?? "leader";
  savedSnapshot.value = snapshot();
};

const confirmOutcome = (): void => {
  const name = newOutcomeName.value.trim();
  if (!name) return;
  if (draft.outcomes.some((outcome) => outcome.name.trim().toLowerCase() === name.toLowerCase())) {
    error.value = "這個成果已經列入";
    return;
  }
  draft.outcomes.push({ name });
  newOutcomeName.value = "";
  error.value = "";
};

const removeOutcome = (index: number): void => {
  draft.outcomes.splice(index, 1);
};

const formatFileSize = (size: number): string =>
  size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(size / 1024)} KB`;

const uploadInterviewFile = async (event: Event): Promise<void> => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (!projectId.value || !selectedStakeholderKey.value) {
    error.value = "請先選擇要上傳給哪位利害關係人";
    input.value = "";
    return;
  }
  // 上傳期間切換下拉選單，檔案仍歸給按下上傳時選的人
  const stakeholderKey = selectedStakeholderKey.value;
  uploadingInterviewFile.value = true;
  error.value = "";
  try {
    const uploaded = await uploadTempInterviewFile(projectId.value, file);
    interviewFiles.value = [...interviewFiles.value, {
      key: uploaded.temp_file_id,
      stakeholderKey,
      original_name: uploaded.original_name,
      size_bytes: uploaded.size_bytes,
      temp_file_id: uploaded.temp_file_id,
      file
    }];
  } catch (caught) {
    error.value = toProjectErrorMessage(caught, "上傳訪綱失敗");
  } finally {
    uploadingInterviewFile.value = false;
    input.value = "";
  }
};

const saveBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const downloadInterviewFile = async (file: DraftInterviewFile): Promise<void> => {
  if (file.file) {
    saveBlob(file.file, file.original_name);
    return;
  }
  if (!file.file_id) return;
  try {
    saveBlob(await downloadProjectInterviewFile(projectId.value, file.file_id), file.original_name);
  } catch (caught) {
    error.value = toProjectErrorMessage(caught, "下載訪綱失敗");
  }
};

const removeInterviewFile = (file: DraftInterviewFile): void => {
  interviewFiles.value = interviewFiles.value.filter((item) => item.key !== file.key);
};

const addStakeholder = (): void => {
  draft.stakeholders.push({ key: newKey(), name: "", role: "", notes: "", pre_form_id: null, post_form_id: null });
};

const removeStakeholder = (index: number): void => {
  const target = draft.stakeholders[index];
  const fileCount = filesOf(target.key).length;
  if (fileCount && !window.confirm(`「${target.name}」有 ${fileCount} 個訪綱檔案，儲存後會一併刪除，確定移除嗎？`)) return;
  draft.stakeholders.splice(index, 1);
  interviewFiles.value = interviewFiles.value.filter((file) => file.stakeholderKey !== target.key);
};

const formatMoney = (value: number | string): string =>
  `${Number(value || 0).toLocaleString("zh-TW")} 元`;

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
  else costs.value.push({ key: newKey(), ...payload });
  closeCostDialog();
};

const confirmDeleteCost = (): void => {
  const target = deletingCost.value;
  if (target) costs.value = costs.value.filter((cost) => cost.key !== target.key);
  deletingCost.value = null;
};

const normalizedPayload = (): ProjectPayload => ({
  name: draft.name.trim(),
  organization: draft.organization.trim(),
  description: draft.description.trim(),
  status: draft.status,
  begin: monthStartIso(beginMonth.value),
  end: monthEndIso(endMonth.value),
  stakeholders: namedStakeholders.value.map((item) => ({
    stakeholder_id: item.stakeholder_id,
    name: item.name.trim(),
    role: item.role.trim(),
    notes: item.notes.trim(),
    pre_form_id: item.pre_form_id || null,
    post_form_id: item.post_form_id || null,
    interview_file_ids: filesOf(item.key).flatMap((file) => file.file_id ? [file.file_id] : []),
    temp_file_ids: filesOf(item.key).flatMap((file) => file.temp_file_id ? [file.temp_file_id] : [])
  })),
  outcomes: draft.outcomes
    .filter((item) => item.name.trim())
    .map((item) => ({ outcome_id: item.outcome_id, name: item.name.trim() })),
  costs: costs.value.map((cost) => ({
    cost_id: cost.cost_id,
    name: cost.name.trim(),
    price: Number(cost.price),
    quantity: Number(cost.quantity),
    funding_source: cost.funding_source.trim()
  }))
});

const snapshot = (): string => JSON.stringify(normalizedPayload());

const isDirty = computed(() => !readOnly.value && !loading.value && snapshot() !== savedSnapshot.value);
const nameMissing = computed(() => !draft.name.trim());

const persist = async (): Promise<WorkspaceProject | null> => {
  if (readOnly.value) return null;
  if (nameMissing.value) {
    error.value = "請輸入專案名稱";
    return null;
  }
  if (!beginMonth.value || !endMonth.value) {
    error.value = "請設定專案的開始與結束年月";
    return null;
  }
  if (endMonth.value < beginMonth.value) {
    error.value = "結束年月不可早於開始年月";
    return null;
  }
  saving.value = true;
  error.value = "";
  savedMessage.value = "";
  // 後端回傳的利害關係人順序與送出的相同，用位置找回原本選的人（新增的人儲存後才有 id）
  const selectedIndex = namedStakeholders.value.findIndex((item) => item.key === selectedStakeholderKey.value);
  try {
    const project = isNew.value
      ? await projectStore.create({ ...normalizedPayload(), group_id: ownerGroupId.value })
      : await projectStore.update(projectId.value, normalizedPayload());
    hydrate(project);
    if (selectedIndex >= 0 && namedStakeholders.value[selectedIndex]) {
      selectedStakeholderKey.value = namedStakeholders.value[selectedIndex].key;
    }
    savedMessage.value = isNew.value ? "專案已建立，可以繼續填寫其他資料" : "專案已儲存";
    if (isNew.value) {
      // 換成編輯頁路由後，畫面會顯示其餘區塊
      await router.replace({ name: "project-edit", params: { projectId: project.project_id } });
    }
    return project;
  } catch (caught) {
    error.value = toProjectErrorMessage(caught, "儲存專案失敗");
    return null;
  } finally {
    saving.value = false;
  }
};

const { leaveDialogOpen, answerLeave } = useUnsavedChanges(isDirty);

// 不會自動儲存專案；有未儲存的修改時，離開提醒會先問使用者
const canCreateForm = computed(() => !isNew.value && !saving.value);

const createProjectForm = async (): Promise<void> => {
  if (!canCreateForm.value) return;
  await router.push({ name: "form-builder-new", params: { projectId: projectId.value } });
};


const createAndLinkForm = async (): Promise<void> => {
  console.log("按鈕有被點擊");

  try {
    const project = await persist();
    console.log("儲存專案結果：", project);

    if (!project) {
      alert("專案儲存沒有成功，請檢查必填欄位或 API");
      return;
    }

    await router.push({
      name: "form-builder-new",
      params: { projectId: project.project_id }
    });
  } catch (error) {
    console.error("建立表單失敗：", error);
    alert("建立表單失敗，請查看 Console");
  }
};

const openProjectForm = async (form: LinkedProjectForm): Promise<void> => {
  await router.push({
    name: "form-builder-edit",
    params: { projectId: projectId.value, formId: form.form_id }
  });
};

const openResponses = async (form: LinkedProjectForm): Promise<void> => {
  await router.push({
    name: "form-responses",
    params: { projectId: projectId.value, formId: form.form_id }
  });
};

onMounted(async () => {
  loading.value = true;
  error.value = "";
  try {
    if (isNew.value) {
      // 只先決定專案位置，按「新增專案」才建立
      creatableGroups.value = await loadCreatable();
      const requested = typeof route.query.group === "string" ? route.query.group : null;
      ownerGroupId.value = creatableGroups.value.some((group) => group.group_id === requested) ? requested : null;
    } else {
      const cachedProject = projectStore.projects.find((item) => item.project_id === projectId.value) ?? null;
      const project = cachedProject ?? await getProject(projectId.value);
      projectStore.upsert(project);
      hydrate(project);
    }
    if (!isNew.value && ownerGroupId.value) {
      // 只用來顯示群組名稱，失敗不影響編輯
      await loadGroups().catch(() => undefined);
    }
  } catch (caught) {
    error.value = toProjectErrorMessage(caught, "無法載入專案");
  } finally {
    loading.value = false;
    if (isNew.value) savedSnapshot.value = snapshot();
  }
});
</script>

<template>
  <section class="project-editor">
    <header class="editor-header">
      <div>
        <RouterLink class="back-link" :to="backTo">{{ ownerGroupId ? "← 返回群組" : "← 返回我的專案" }}</RouterLink>
        <p class="eyebrow">專案工作區</p>
        <h1>{{ isNew ? "新增專案" : readOnly ? "檢視專案" : "編輯專案" }}</h1>
      </div>
      <div class="editor-header__actions">
        <RouterLink
          v-if="!isNew"
          class="secondary-button"
          :to="{ name: 'project-sroi', params: { projectId } }"
        >SROI 計算 →</RouterLink>
        <span v-if="isDirty && !isNew" class="dirty-hint">有未儲存的修改</span>
        <button v-if="!readOnly" class="primary-button" type="button" :disabled="saving || loading || nameMissing" @click="persist">
          {{ saving ? (isNew ? "新增中…" : "儲存中…") : (isNew ? "新增專案" : "儲存專案") }}
        </button>
      </div>
    </header>

    <p v-if="error" class="message message--error">{{ error }}</p>
    <p v-if="savedMessage" class="message message--success">{{ savedMessage }}</p>
    <p v-if="loading" class="message">專案載入中…</p>

    <template v-else>
      <p v-if="readOnly" class="message">你在這個群組是檢視者，只能查看專案內容。</p>

      <fieldset class="plain-fieldset" :disabled="readOnly">
      <section class="editor-card">
        <div class="section-heading">
          <div><span>01</span><h2>專案資料</h2></div>
          <p>{{ isNew ? "先填寫基本資料，新增專案後即可設定成本、利害關係人與表單。" : "這些資料會顯示在專案總覽。" }}</p>
        </div>
        <div class="field-grid">
          <label class="field field--wide">專案名稱（必填）<input v-model="draft.name" maxlength="255" placeholder="請輸入專案名稱" required /></label>
          <label class="field">所屬單位<input v-model="draft.organization" maxlength="255" /></label>
          <label class="field">開始年月<DateInput v-model="beginMonth" type="month" required /></label>
          <label class="field">結束年月<DateInput v-model="endMonth" type="month" :min="beginMonth" required /></label>
          <label class="field">狀態
            <select v-model="draft.status"><option value="draft">草稿</option><option value="published">已發布</option></select>
          </label>
          <label v-if="isNew" class="field">專案位置
            <select v-model="ownerGroupId">
              <option :value="null">個人專案</option>
              <option v-for="group in creatableGroups" :key="group.group_id" :value="group.group_id">
                群組・{{ group.title }}
              </option>
            </select>
          </label>
          <p v-else-if="ownerGroupId" class="field">專案位置<span class="owner-label">{{ ownerLabel }}</span></p>
          <label class="field field--wide">專案說明<textarea v-model="draft.description" rows="4"></textarea></label>
        </div>

        <div v-if="!isNew" class="cost-section">
          <div class="cost-section__heading">
            <div>
              <h3>成本明細</h3>
              <p v-if="!readOnly">總成本為各項「金額 × 個數」自動加總，無法直接修改；按「儲存專案」後才會存入。</p>
            </div>
            <button
              v-if="!readOnly"
              class="secondary-button"
              type="button"
              @click="openCostDialog()"
            >＋ 新增成本</button>
          </div>
          <p v-if="!costs.length" class="empty-state">尚未新增成本。</p>
          <article v-for="(cost, index) in costs" :key="cost.key" class="cost-row">
            <span class="stakeholder-number">{{ String(index + 1).padStart(2, "0") }}</span>
            <div class="field">項目<span class="cost-value">{{ cost.name }}</span></div>
            <div class="field">金額<span class="cost-value">{{ formatMoney(cost.price) }}</span></div>
            <div class="field">個數<span class="cost-value">{{ cost.quantity }}</span></div>
            <div class="field">小計<span class="cost-value">{{ formatMoney(cost.price * cost.quantity) }}</span></div>
            <div class="field">經費來源<span class="cost-value">{{ cost.funding_source || "—" }}</span></div>
            <div v-if="!readOnly" class="cost-actions">
              <button class="remove-button" type="button" @click="openCostDialog(cost)">修改</button>
              <button class="remove-button" type="button" @click="deletingCost = cost">刪除</button>
            </div>
          </article>
          <div class="cost-total">
            <span>總成本</span>
            <strong>{{ formatMoney(totalCost) }}</strong>
          </div>
        </div>
      </section>

      <section v-if="!isNew" class="editor-card">
        <div class="section-heading section-heading--action">
          <div><span>02</span><h2>利害關係人</h2></div>
          <button v-if="!readOnly" class="secondary-button" type="button" @click="addStakeholder">＋ 新增利害關係人</button>
        </div>
        <p v-if="!draft.stakeholders.length" class="empty-state">尚未設定利害關係人。</p>
        <p v-else-if="!projectForms.length" class="form-hint">這個專案還沒有表單，請先在「專案表單」新增後，再選擇前測與後測。</p>
        <article v-for="(stakeholder, index) in draft.stakeholders" :key="stakeholder.key" class="stakeholder-row">
          <span class="stakeholder-number">{{ String(index + 1).padStart(2, "0") }}</span>
          <label class="field">名稱<input v-model="stakeholder.name" placeholder="例：計畫參與者" required /></label>
          <label class="field">關係／類型<input v-model="stakeholder.role" placeholder="例：受益人" /></label>
          <label class="field">前測表單
            <select v-model="stakeholder.pre_form_id" :disabled="!projectForms.length">
              <option :value="null">不指定</option>
              <option
                v-for="form in projectForms"
                :key="form.form_id"
                :value="form.form_id"
                :disabled="form.form_id === stakeholder.post_form_id"
              >{{ form.title || "未命名表單" }}</option>
            </select>
          </label>
          <label class="field">後測表單
            <select v-model="stakeholder.post_form_id" :disabled="!projectForms.length">
              <option :value="null">不指定</option>
              <option
                v-for="form in projectForms"
                :key="form.form_id"
                :value="form.form_id"
                :disabled="form.form_id === stakeholder.pre_form_id"
              >{{ form.title || "未命名表單" }}</option>
            </select>
          </label>
          <label class="field field--notes">備註<input v-model="stakeholder.notes" /></label>
          <div class="stakeholder-actions">
            <RouterLink
              v-if="stakeholder.stakeholder_id"
              class="sroi-link"
              :to="{
                name: 'project-sroi',
                params: { projectId },
                query: { stakeholder: stakeholder.stakeholder_id }
              }"
            >查看 SROI</RouterLink>
            <span v-else class="sroi-link sroi-link--disabled">儲存後查看 SROI</span>
            <button v-if="!readOnly" class="remove-button" type="button" @click="removeStakeholder(index)">移除</button>
          </div>
        </article>
      </section>
      </fieldset>

      <CostDialog
        :open="costDialogOpen"
        :cost="editingCost"
        @submit="submitCost"
        @cancel="closeCostDialog"
      />
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
        :open="leaveDialogOpen"
        title="尚未儲存"
        :message="isNew ? '專案還沒儲存，離開後輸入的內容不會建立。確定要離開嗎？' : '有修改還沒儲存，離開後會遺失。確定要離開嗎？'"
        confirm-text="離開"
        danger
        @confirm="answerLeave(true)"
        @cancel="answerLeave(false)"
      />

      <section v-if="!isNew" class="editor-card">
        <div class="section-heading">
          <div><span>03</span><h2>訪綱附件</h2></div>
          <p v-if="!readOnly">支援 PDF、DOC、DOCX，單一檔案上限 10 MB。上傳的檔案按「儲存專案」後才會正式存入。</p>
        </div>
        <label class="field upload-target">利害關係人
          <select v-model="selectedStakeholderKey" :disabled="!namedStakeholders.length || uploadingInterviewFile">
            <option v-if="!namedStakeholders.length" value="">請先新增利害關係人並填寫名稱</option>
            <option v-for="item in namedStakeholders" :key="item.key" :value="item.key">
              {{ item.name }}（{{ filesOf(item.key).length }}）
            </option>
          </select>
        </label>
        <label
          v-if="!readOnly"
          class="upload-zone"
          :class="{ 'upload-zone--busy': uploadingInterviewFile, 'upload-zone--disabled': !selectedStakeholderKey }"
        >
          <input
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            :disabled="uploadingInterviewFile || !selectedStakeholderKey"
            @change="uploadInterviewFile"
          />
          <strong>{{ uploadingInterviewFile ? "上傳中…" : "＋ 上傳訪綱" }}</strong>
          <span>可上傳訪談大綱、訪談題目或相關說明文件</span>
        </label>
        <div v-if="selectedFiles.length" class="file-list">
          <article v-for="file in selectedFiles" :key="file.key" class="file-row">
            <div>
              <strong>{{ file.original_name }}</strong>
              <span>{{ formatFileSize(file.size_bytes) }}{{ file.temp_file_id ? "・尚未儲存" : "" }}</span>
            </div>
            <button type="button" @click="downloadInterviewFile(file)">下載</button>
            <button v-if="!readOnly" type="button" @click="removeInterviewFile(file)">刪除</button>
          </article>
        </div>
        <p v-else-if="selectedStakeholderKey" class="empty-state">這位利害關係人尚未上傳訪綱。</p>
        <p v-else class="empty-state">請先新增利害關係人並填寫名稱。</p>

        <div class="outcome-section">
          <div class="outcome-section__heading">
            <div>
              <h3>成果初列</h3>
              <p v-if="!readOnly">確認後會變成標籤，按「儲存專案」後才會存入：編輯中的表單會同步，已發布的表單會保留原版本。</p>
            </div>
          </div>
          <div v-if="!readOnly" class="outcome-composer">
            <input
              v-model="newOutcomeName"
              maxlength="255"
              placeholder="例：提升團隊合作能力"
              aria-label="成果名稱"
              @keyup.enter="confirmOutcome"
            />
            <button class="secondary-button" type="button" :disabled="!newOutcomeName.trim()" @click="confirmOutcome">
              確認新增
            </button>
          </div>
          <div v-if="draft.outcomes.length" class="outcome-tags" aria-label="已列入成果">
            <button
              v-for="(outcome, index) in draft.outcomes"
              :key="outcome.outcome_id || `${outcome.name}-${index}`"
              type="button"
              :disabled="saving || readOnly"
              :aria-label="`刪除成果 ${outcome.name}`"
              :title="`刪除 ${outcome.name}`"
              @click="removeOutcome(index)"
            >
              <span>#{{ outcome.name }}</span><b aria-hidden="true">×</b>
            </button>
          </div>
          <p v-else class="empty-state">尚未初列成果。</p>
        </div>
      </section>

      <section v-if="!isNew" class="editor-card">
        <div class="section-heading">
          <div><span>04</span><h2>專案表單</h2></div>
          <button v-if="!readOnly" class="secondary-button" type="button" :disabled="!canCreateForm" @click="createProjectForm">＋ 新增表單</button>
        </div>
        <div v-for="form in projectForms" :key="form.form_id" class="linked-form-card">
          <div>
            <strong>{{ form.title || "未命名表單" }}</strong>
            <span :class="{ 'form-status--published': form.status === 'published' }">
              {{ form.status === "published" ? "已發布" : form.status === "closed" ? "已關閉" : "編輯中" }}
            </span>
          </div>
          <div class="form-actions">
            <button class="secondary-button" type="button" @click="openProjectForm(form)">{{ readOnly ? "檢視表單 →" : "編輯表單 →" }}</button>
            <button v-if="form.status === 'published'" class="secondary-button" type="button" @click="openResponses(form)">查看回覆與結果</button>
          </div>
        </div>
        <div v-if="!projectForms.length" class="form-linker">
          <p>這個專案還沒有表單，新增時會使用上方成果標籤作為預設區塊。</p>
        </div>
        <p v-if="projectForms.some((form) => form.status === 'draft')" class="form-hint">成果初列會同步到編輯中的表單；已發布的表單不會被修改。</p>
      </section>
    </template>
  </section>
</template>

<style scoped>
.project-editor { display: grid; gap: 24px; color: #161616; }
.editor-header { display: flex; align-items: end; justify-content: space-between; gap: 20px; padding-bottom: 22px; border-bottom: 2px solid #111; }
.back-link { display: inline-block; margin-bottom: 24px; color: #555; font-size: 14px; text-decoration: none; }
.eyebrow { margin: 0 0 8px; font-size: 14px; font-weight: 800; letter-spacing: .15em; }
h1, h2, h3, p { margin: 0; }
h1 { font-size: 24px; letter-spacing: -.05em; }
h2 { font-size: 18px; }
.primary-button, .secondary-button, .remove-button { min-height: 40px; border: 1px solid #111; padding: 8px 14px; background: #fff; color: #111; font: inherit; font-size: 14px; font-weight: 750; cursor: pointer; }
.primary-button { background: #111; color: #fff; }
button:disabled { cursor: not-allowed; opacity: .5; }
.editor-header__actions { display: flex; align-items: center; gap: 10px; }
.dirty-hint { color: #8a5a00; font-size: 14px; font-weight: 700; }
.message { padding: 12px 14px; border: 1px solid #ccc; }
.message--error { border-color: #bd7676; color: #8c2020; }
.message--success { border-color: #87aa8c; color: #286133; }
.plain-fieldset { display: grid; gap: 24px; min-width: 0; margin: 0; padding: 0; border: 0; }
.owner-label { overflow: hidden; border: 1px solid #e3e3e3; padding: 11px 12px; background: #f7f7f7; color: #111; font-size: 14px; font-weight: 400; text-overflow: ellipsis; white-space: nowrap; }
.editor-card { display: grid; gap: 22px; padding: 26px; border: 1px solid #d8d8d8; background: #fff; }
.section-heading { display: flex; align-items: start; justify-content: space-between; gap: 20px; padding-bottom: 18px; border-bottom: 1px solid #ddd; }
.section-heading > div { display: flex; align-items: center; gap: 12px; }
.section-heading span { color: #888; font-size: 14px; font-weight: 800; }
.section-heading p { max-width: 440px; color: #666; font-size: 14px; line-height: 1.6; }
.field-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 18px; }
.upload-target { max-width: 320px; }
.field--wide { grid-column: 1 / -1; }
.field { display: grid; gap: 7px; color: #555; font-size: 14px; font-weight: 700; }
.field input, .field select, .field textarea, .field .date-input { width: 100%; border: 1px solid #ccc; border-radius: 0; padding: 11px 12px; background: #fff; color: #111; font: inherit; font-size: 14px; outline: none; }
.field input:focus, .field select:focus, .field textarea:focus, .field .date-input:focus-within { border-color: #111; }
.stakeholder-row { display: grid; grid-template-columns: 32px repeat(4, 1fr) 1.2fr auto; align-items: end; gap: 12px; padding-bottom: 18px; border-bottom: 1px solid #eee; }
.stakeholder-number { align-self: center; color: #999; font-size: 14px; }
.stakeholder-actions { display: grid; gap: 7px; }
.sroi-link { display: grid; min-height: 40px; box-sizing: border-box; place-items: center; border: 1px solid #765292; padding: 8px 12px; color: #68447f; font-size: 14px; font-weight: 750; text-align: center; text-decoration: none; white-space: nowrap; }
.sroi-link--disabled { border-color: #ddd; color: #999; cursor: not-allowed; }
.remove-button { border-color: #ccc; }
.empty-state { padding: 24px; background: #f7f7f7; color: #666; text-align: center; }
.cost-section { display: grid; gap: 16px; padding-top: 24px; border-top: 1px solid #ddd; }
.cost-section__heading { display: flex; align-items: start; justify-content: space-between; gap: 20px; }
.cost-section__heading h3 { margin-bottom: 6px; font-size: 16px; }
.cost-section__heading p { color: #666; font-size: 14px; line-height: 1.6; }
.cost-row { display: grid; grid-template-columns: 32px 1.4fr 1fr .6fr 1fr 1.2fr auto; align-items: end; gap: 12px; padding-bottom: 18px; border-bottom: 1px solid #eee; }
.cost-value { overflow: hidden; border: 1px solid #e3e3e3; padding: 11px 12px; background: #f7f7f7; color: #111; font-size: 14px; font-weight: 400; text-overflow: ellipsis; white-space: nowrap; }
.cost-actions { display: flex; gap: 8px; }
.cost-total { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 14px 16px; background: #111; color: #fff; }
.cost-total span { font-size: 14px; font-weight: 700; }
.cost-total strong { font-size: 18px; }
.outcome-section { display: grid; gap: 16px; margin-top: 6px; padding-top: 24px; border-top: 1px solid #ddd; }
.outcome-section__heading { display: flex; align-items: start; justify-content: space-between; gap: 20px; }
.outcome-section__heading h3 { margin-bottom: 6px; font-size: 16px; }
.outcome-section__heading p { color: #666; font-size: 14px; line-height: 1.6; }
.outcome-composer { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; }
.outcome-composer input { min-width: 0; border: 1px solid #ccc; padding: 11px 12px; background: #fff; color: #111; font: inherit; font-size: 14px; outline: none; }
.outcome-composer input:focus { border-color: #765292; box-shadow: 0 0 0 2px #eee4f3; }
.outcome-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.outcome-tags button { display: inline-flex; align-items: center; gap: 7px; border: 0; border-radius: 999px; padding: 7px 10px 7px 12px; background: #f0e8f4; color: #6d4688; font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
.outcome-tags button b { display: grid; width: 17px; height: 17px; place-items: center; border-radius: 50%; background: #765292; color: #fff; font-size: 14px; line-height: 1; opacity: 0; transform: scale(.7); transition: opacity .15s ease, transform .15s ease; }
.outcome-tags button:hover b, .outcome-tags button:focus-visible b { opacity: 1; transform: scale(1); }
.outcome-tags button:hover { background: #e8daee; }
.upload-zone { display: grid; justify-items: center; gap: 7px; padding: 32px 20px; border: 1px dashed #a994b4; background: #faf7fc; color: #765292; cursor: pointer; }
.upload-zone input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.upload-zone strong { font-size: 14px; }
.upload-zone span { color: #817786; font-size: 14px; }
.upload-zone--busy { cursor: wait; opacity: .6; }
.upload-zone--disabled { cursor: not-allowed; opacity: .5; }
.file-list { display: grid; border-top: 1px solid #ddd; }
.file-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 12px; padding: 13px 0; border-bottom: 1px solid #eee; }
.file-row div { display: grid; min-width: 0; gap: 4px; }
.file-row strong { overflow: hidden; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.file-row span { color: #888; font-size: 14px; }
.file-row button { border: 0; border-bottom: 1px solid #777; padding: 2px 0; background: transparent; color: #555; font-size: 14px; cursor: pointer; }
.linked-form-card { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 18px; border: 1px solid #ded6e3; background: #faf7fc; }
.linked-form-card > div:first-child { display: grid; gap: 7px; }
.linked-form-card strong { font-size: 15px; }
.linked-form-card span { width: fit-content; padding: 4px 8px; border-radius: 999px; background: #f0e8f4; color: #765292; font-size: 14px; font-weight: 700; }
.linked-form-card .form-status--published { background: #e5f3e8; color: #2f7140; }
.form-actions { display: flex; gap: 10px; }
.form-linker { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 18px; background: #f7f7f7; }
.form-linker p { color: #666; font-size: 14px; line-height: 1.6; }
.form-hint { margin: -10px 0 0; color: #7b647f; font-size: 14px; }
@media (max-width: 900px) { .field-grid, .stakeholder-row, .cost-row { grid-template-columns: 1fr; } .stakeholder-number { display: none; } }
@media (max-width: 700px) { .linked-form-card, .form-linker, .form-actions { align-items: stretch; flex-direction: column; } }
@media (max-width: 600px) { .editor-header, .section-heading { align-items: stretch; flex-direction: column; } .editor-card { padding: 18px; } .outcome-composer { grid-template-columns: 1fr; } }
</style>
