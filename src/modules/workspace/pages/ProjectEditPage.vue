<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  downloadProjectInterviewFile,
  getProject,
  uploadTempInterviewFile
} from "@/modules/workspace/api/workspace.api";
import ConfirmDialog from "@/modules/workspace/components/ConfirmDialog.vue";
import ProjectPhaseBadge from "@/modules/workspace/components/ProjectPhaseBadge.vue";
import StakeholderDialog from "@/modules/workspace/components/StakeholderDialog.vue";
import { isProjectPhaseTab } from "@/modules/workspace/composables/useProjectPhaseTab";
import { useVerifiedGroups } from "@/modules/workspace/composables/useVerifiedGroups";
import { getProjectPhase, toProjectErrorMessage } from "@/modules/workspace/constants";
import { useProjectStore } from "@/modules/workspace/store/project.store";
import type {
  Group,
  GroupRole,
  LinkedProjectForm,
  ProjectPayload,
  StakeholderDraft,
  WorkspaceProject
} from "@/modules/workspace/types/workspace.types";
import DateInput from "@/shared/components/DateInput.vue";
import { useUnsavedChanges } from "@/shared/composables/useUnsavedChanges";
import { currentTaipeiYear, monthEndIso, monthStartIso, toMonthValue } from "@/shared/utils/date";

// 所有內容（含利害關係人的成果、成本與訪綱）都先改在畫面上，按「儲存專案」才一次存入

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
const selectedStakeholderKey = ref("");
const currentYear = currentTaipeiYear();
const beginMonth = ref(`${currentYear}-01`);
const endMonth = ref(`${currentYear}-12`);
const stakeholderDialogOpen = ref(false);
// 正在編輯的利害關係人；null 表示新增
const editingStakeholder = ref<StakeholderDraft | null>(null);
// 最後一次儲存（或載入）時的內容，用來判斷有沒有未儲存的修改
const savedSnapshot = ref("");
// 已儲存（或載入）的專案期間；狀態只依這份計算，畫面上改年月要等儲存後才會變
const savedPeriod = ref<Pick<WorkspaceProject, "begin" | "end"> | null>(null);
const projectPhase = computed(() => (savedPeriod.value ? getProjectPhase(savedPeriod.value) : null));

// 專案位置：null 是個人專案。新增時可選擇，入口網址 ?group= 帶入預設群組，建立後不能移動
const { load: loadGroups, loadCreatable, titleOf } = useVerifiedGroups();
const creatableGroups = ref<Group[]>([]);
const ownerGroupId = ref<string | null>(null);
const myRole = ref<GroupRole>("leader");
const readOnly = computed(() => myRole.value === "viewer");
type EditorTab = "info" | "stakeholders" | "interviews" | "forms";

const EDITOR_TABS: { key: EditorTab; label: string }[] = [
  { key: "info", label: "專案資料" },
  { key: "stakeholders", label: "利害關係人" },
  { key: "interviews", label: "訪綱附件" },
  { key: "forms", label: "專案表單" }
];

const isEditorTab = (value: unknown): value is EditorTab =>
  typeof value === "string" && EDITOR_TABS.some((tab) => tab.key === value);

// 分頁存在網址的 ?tab=；新增專案只有「專案資料」可以用
const activeTab = computed<EditorTab>({
  get: () => (!isNew.value && isEditorTab(route.query.tab) ? route.query.tab : "info"),
  set: (tab) => {
    const { tab: _removed, ...rest } = route.query;
    void router.replace({ query: tab === "info" ? rest : { ...rest, tab } });
  }
});

// 從列表進來時網址帶著 ?phase=，返回時回到原本的分頁
const backTo = computed(() => {
  const query = isProjectPhaseTab(route.query.phase) ? { phase: route.query.phase } : {};
  return ownerGroupId.value
    ? { name: "group-detail", params: { groupId: ownerGroupId.value }, query }
    : { name: "my-projects", query };
});
// 編輯時只有群組專案顯示所屬群組
const ownerLabel = computed(() => `群組・${titleOf(ownerGroupId.value)}`);

const draft = reactive<Omit<ProjectPayload, "begin" | "end" | "stakeholders"> & { stakeholders: StakeholderDraft[] }>({
  name: "",
  organization: "",
  description: "",
  status: "draft",
  stakeholders: []
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

const stakeholderCost = (stakeholder: StakeholderDraft): number =>
  stakeholder.costs.reduce((total, cost) => total + Number(cost.price) * Number(cost.quantity), 0);

// 總成本是所有利害關係人的成本加總；儲存前先在畫面上試算，儲存後的值以後端加總為準
const totalCost = computed(() =>
  namedStakeholders.value.reduce((total, stakeholder) => total + stakeholderCost(stakeholder), 0)
);

const formTitleOf = (formId: string | null): string =>
  formId ? projectForms.value.find((form) => form.form_id === formId)?.title || "未命名表單" : "不指定";

const hydrate = (project: WorkspaceProject): void => {
  draft.name = project.name;
  draft.organization = project.organization;
  draft.description = project.description;
  beginMonth.value = toMonthValue(project.begin);
  endMonth.value = toMonthValue(project.end);
  savedPeriod.value = { begin: project.begin, end: project.end };
  draft.status = project.status;
  // 成果、成本在回應裡是整個專案一份清單，依 stakeholder_id 分給各利害關係人
  draft.stakeholders = project.stakeholders.map((stakeholder) => ({
    key: stakeholder.stakeholder_id ?? newKey(),
    stakeholder_id: stakeholder.stakeholder_id,
    name: stakeholder.name,
    relation: stakeholder.relation ?? "",
    stakeholder_type: stakeholder.stakeholder_type ?? "",
    notes: stakeholder.notes,
    pre_form_id: stakeholder.pre_form_id ?? null,
    post_form_id: stakeholder.post_form_id ?? null,
    outcomes: project.outcomes
      .filter((outcome) => outcome.stakeholder_id === stakeholder.stakeholder_id)
      .map(({ outcome_id, name }) => ({ outcome_id, name })),
    costs: (project.costs ?? [])
      .filter((cost) => cost.stakeholder_id === stakeholder.stakeholder_id)
      .map((cost) => ({
        key: cost.cost_id,
        cost_id: cost.cost_id,
        name: cost.name,
        price: Number(cost.price),
        quantity: Number(cost.quantity),
        funding_source: cost.funding_source
      }))
  }));
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

const openStakeholderDialog = (stakeholder: StakeholderDraft | null = null): void => {
  editingStakeholder.value = stakeholder;
  stakeholderDialogOpen.value = true;
};

const closeStakeholderDialog = (): void => {
  stakeholderDialogOpen.value = false;
  editingStakeholder.value = null;
};

// 彈窗的「儲存」只更新畫面上的資料，按「儲存專案」才存入資料庫
const saveStakeholder = (stakeholder: StakeholderDraft): void => {
  const index = draft.stakeholders.findIndex((item) => item.key === stakeholder.key);
  if (index >= 0) draft.stakeholders.splice(index, 1, stakeholder);
  else draft.stakeholders.push(stakeholder);
  closeStakeholderDialog();
};

const removeStakeholder = (index: number): void => {
  const target = draft.stakeholders[index];
  const fileCount = filesOf(target.key).length;
  const related = [
    target.outcomes.length ? `${target.outcomes.length} 個成果` : "",
    target.costs.length ? `${target.costs.length} 筆成本` : "",
    fileCount ? `${fileCount} 個訪綱檔案` : ""
  ].filter(Boolean);
  if (related.length && !window.confirm(`「${target.name}」有 ${related.join("、")}，儲存後會一併刪除，確定移除嗎？`)) return;
  draft.stakeholders.splice(index, 1);
  interviewFiles.value = interviewFiles.value.filter((file) => file.stakeholderKey !== target.key);
};

const formatMoney = (value: number | string): string =>
  `${Number(value || 0).toLocaleString("zh-TW")} 元`;

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
    relation: item.relation.trim(),
    stakeholder_type: item.stakeholder_type.trim(),
    notes: item.notes.trim(),
    pre_form_id: item.pre_form_id || null,
    post_form_id: item.post_form_id || null,
    outcomes: item.outcomes
      .filter((outcome) => outcome.name.trim())
      .map((outcome) => ({ outcome_id: outcome.outcome_id, name: outcome.name.trim() })),
    costs: item.costs.map((cost) => ({
      cost_id: cost.cost_id,
      name: cost.name.trim(),
      price: Number(cost.price),
      quantity: Number(cost.quantity),
      funding_source: cost.funding_source.trim()
    })),
    interview_file_ids: filesOf(item.key).flatMap((file) => file.file_id ? [file.file_id] : []),
    temp_file_ids: filesOf(item.key).flatMap((file) => file.temp_file_id ? [file.temp_file_id] : [])
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
    <div class="editor-sticky">
      <header class="editor-header">
        <div>
          <RouterLink class="back-link" :to="backTo">{{ ownerGroupId ? "← 返回群組" : "← 返回我的專案" }}</RouterLink>
          <p class="eyebrow">專案工作區</p>
          <div class="editor-title">
            <h1>{{ isNew ? "新增專案" : readOnly ? "檢視專案" : "編輯專案" }}</h1>
            <ProjectPhaseBadge v-if="projectPhase" :phase="projectPhase" />
            <div class="tab-bar" role="tablist" aria-label="專案工作區分頁">
              <button
                v-for="tab in EDITOR_TABS"
                :key="tab.key"
                type="button"
                class="tab-bar__item"
                :class="{ 'tab-bar__item--active': activeTab === tab.key }"
                role="tab"
                :aria-selected="activeTab === tab.key"
                :disabled="isNew && tab.key !== 'info'"
                :title="isNew && tab.key !== 'info' ? '新增專案後才能使用' : undefined"
                @click="activeTab = tab.key"
              >{{ tab.label }}</button>
            </div>
          </div>
        </div>
        <div class="editor-header__actions">
          <span v-if="isDirty && !isNew" class="dirty-hint">● 有未儲存的修改</span>
          <div class="editor-header__buttons">
            <RouterLink
              v-if="!isNew"
              class="secondary-button"
              :to="{ name: 'project-sroi', params: { projectId } }"
            >SROI 計算 →</RouterLink>
            <button v-if="!readOnly" class="primary-button" type="button" :disabled="saving || loading || nameMissing" @click="persist">
              {{ saving ? (isNew ? "新增中…" : "儲存中…") : (isNew ? "新增專案" : "儲存專案") }}
            </button>
          </div>
        </div>
      </header>

      <p v-if="error" class="message message--error">{{ error }}</p>
      <p v-if="savedMessage" class="message message--success">{{ savedMessage }}</p>
    </div>

    <p v-if="loading" class="message">專案載入中…</p>

    <template v-else>
      <p v-if="readOnly" class="message">你在這個群組是檢視者，只能查看專案內容。</p>

      <fieldset class="plain-fieldset" :disabled="readOnly">
      <section v-show="activeTab === 'info'" class="editor-card">
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

        <div v-if="!isNew" class="cost-total">
          <span>總成本（所有利害關係人的成本加總，請在「利害關係人」分頁編輯）</span>
          <strong>{{ formatMoney(totalCost) }}</strong>
        </div>
      </section>
      </fieldset>

      <!-- 利害關係人改在彈窗裡編輯，不放進 fieldset：檢視者也要能按「檢視」打開彈窗 -->
      <section v-if="!isNew" v-show="activeTab === 'stakeholders'" class="editor-card">
        <div class="section-heading section-heading--action">
          <div><span>02</span><h2>利害關係人</h2></div>
          <button v-if="!readOnly" class="secondary-button" type="button" @click="openStakeholderDialog()">＋ 新增利害關係人</button>
        </div>
        <p v-if="!draft.stakeholders.length" class="empty-state">尚未設定利害關係人。</p>
        <article v-for="(stakeholder, index) in draft.stakeholders" :key="stakeholder.key" class="stakeholder-card">
          <span class="stakeholder-number">{{ String(index + 1).padStart(2, "0") }}</span>
          <div class="stakeholder-card__body">
            <div class="stakeholder-card__title">
              <h3>{{ stakeholder.name }}</h3>
              <span v-if="stakeholder.relation" class="stakeholder-chip">{{ stakeholder.relation }}</span>
              <span v-if="stakeholder.stakeholder_type" class="stakeholder-chip stakeholder-chip--type">{{ stakeholder.stakeholder_type }}</span>
            </div>
            <div v-if="stakeholder.outcomes.length" class="outcome-tags outcome-tags--static" aria-label="成果">
              <span v-for="outcome in stakeholder.outcomes" :key="outcome.outcome_id || outcome.name">#{{ outcome.name }}</span>
            </div>
            <p v-else class="stakeholder-card__muted">尚未初列成果</p>
            <dl class="stakeholder-card__meta">
              <div><dt>成本</dt><dd>{{ stakeholder.costs.length }} 筆・{{ formatMoney(stakeholderCost(stakeholder)) }}</dd></div>
              <div><dt>前測</dt><dd>{{ formTitleOf(stakeholder.pre_form_id) }}</dd></div>
              <div><dt>後測</dt><dd>{{ formTitleOf(stakeholder.post_form_id) }}</dd></div>
              <div v-if="stakeholder.notes" class="stakeholder-card__notes"><dt>備註</dt><dd>{{ stakeholder.notes }}</dd></div>
            </dl>
          </div>
          <div class="stakeholder-actions">
            <button class="secondary-button" type="button" @click="openStakeholderDialog(stakeholder)">{{ readOnly ? "檢視" : "編輯" }}</button>
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

      <StakeholderDialog
        :open="stakeholderDialogOpen"
        :stakeholder="editingStakeholder"
        :forms="projectForms"
        :read-only="readOnly"
        :new-key="newKey"
        @save="saveStakeholder"
        @close="closeStakeholderDialog"
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

      <section v-if="!isNew" v-show="activeTab === 'interviews'" class="editor-card">
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
      </section>

      <section v-if="!isNew" v-show="activeTab === 'forms'" class="editor-card">
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
          <p>這個專案還沒有表單，新增時會使用各利害關係人的成果作為預設區塊。</p>
        </div>
        <p v-if="projectForms.some((form) => form.status === 'draft')" class="form-hint">利害關係人的成果會同步到編輯中的表單；已發布的表單不會被修改。</p>
      </section>
    </template>
  </section>
</template>

<style scoped>
.project-editor { display: grid; gap: 24px; color: #161616; }
/* 標題、儲存按鈕、分頁、訊息一起凍結在最上方；往上延伸蓋住 MainLayout 的上方留白，捲動時內容不會從縫隙露出 */
.editor-sticky { position: sticky; top: 0; z-index: 10; display: grid; gap: 14px; margin-top: -30px; padding: 30px 0 14px; background: #fff; border-bottom: 1px solid #ddd; }
/* 分頁跟標題在同一列，和標題之間多留一點距離 */
.tab-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-left: 12px; }
.tab-bar__item { border: 1px solid #111; padding: 6px 14px; background: #fff; color: #111; font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
.tab-bar__item--active { background: #111; color: #fff; }
.tab-bar__item:disabled { border-color: #ccc; color: #999; }
.editor-header { display: flex; align-items: end; justify-content: space-between; gap: 20px; padding-bottom: 16px; border-bottom: 2px solid #111; }
.back-link { display: inline-block; margin-bottom: 12px; color: #555; font-size: 14px; text-decoration: none; }
.eyebrow { margin: 0 0 8px; font-size: 14px; font-weight: 800; letter-spacing: .15em; }
h1, h2, h3, p { margin: 0; }
h1 { font-size: 24px; letter-spacing: -.05em; }
h2 { font-size: 18px; }
.primary-button, .secondary-button, .remove-button { min-height: 40px; border: 1px solid #111; padding: 8px 14px; background: #fff; color: #111; font: inherit; font-size: 14px; font-weight: 750; cursor: pointer; }
.primary-button { background: #111; color: #fff; }
button:disabled { cursor: not-allowed; opacity: .5; }
.editor-title { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
/* 未儲存提示在按鈕上方，按鈕維持跟標題、分頁同一列 */
.editor-header__actions { display: grid; flex: none; justify-items: end; gap: 6px; }
.editor-header__buttons { display: flex; align-items: center; gap: 8px; }
.editor-header__buttons .primary-button,
.editor-header__buttons .secondary-button { display: inline-flex; align-items: center; min-height: 36px; padding: 6px 14px; text-decoration: none; }
.dirty-hint { color: #8a5a00; font-size: 13px; font-weight: 700; white-space: nowrap; }
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
.stakeholder-card { display: grid; grid-template-columns: 32px minmax(0, 1fr) auto; align-items: start; gap: 16px; padding-bottom: 18px; border-bottom: 1px solid #eee; }
.stakeholder-card__body { display: grid; gap: 12px; min-width: 0; }
.stakeholder-card__title { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.stakeholder-card__title h3 { margin-right: 4px; font-size: 17px; }
.stakeholder-chip { padding: 3px 9px; border: 1px solid #111; font-size: 13px; font-weight: 700; }
.stakeholder-chip--type { border-color: #765292; color: #68447f; }
.stakeholder-card__muted { color: #999; font-size: 14px; }
.stakeholder-card__meta { display: flex; flex-wrap: wrap; gap: 8px 24px; margin: 0; font-size: 14px; }
.stakeholder-card__meta div { display: flex; gap: 8px; min-width: 0; }
.stakeholder-card__meta dt { color: #888; font-weight: 700; }
.stakeholder-card__meta dd { margin: 0; overflow-wrap: anywhere; }
.stakeholder-card__notes { flex-basis: 100%; }
.stakeholder-card__notes dd { white-space: pre-wrap; }
.outcome-tags--static span { padding: 5px 11px; border-radius: 999px; background: #f0e8f4; color: #6d4688; font-size: 14px; font-weight: 700; }
.stakeholder-number { padding-top: 3px; color: #999; font-size: 14px; }
.stakeholder-actions { display: grid; gap: 7px; }
.sroi-link { display: grid; min-height: 40px; box-sizing: border-box; place-items: center; border: 1px solid #765292; padding: 8px 12px; color: #68447f; font-size: 14px; font-weight: 750; text-align: center; text-decoration: none; white-space: nowrap; }
.sroi-link--disabled { border-color: #ddd; color: #999; cursor: not-allowed; }
.remove-button { border-color: #ccc; }
.empty-state { padding: 24px; background: #f7f7f7; color: #666; text-align: center; }
.cost-total { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 14px 16px; background: #111; color: #fff; }
.cost-total span { font-size: 14px; font-weight: 700; }
.cost-total strong { font-size: 18px; }
.outcome-tags { display: flex; flex-wrap: wrap; gap: 8px; }
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
@media (max-width: 900px) { .field-grid, .stakeholder-card { grid-template-columns: 1fr; } .stakeholder-number { display: none; } .stakeholder-actions { grid-auto-flow: column; justify-content: start; } }
@media (max-width: 700px) { .linked-form-card, .form-linker, .form-actions { align-items: stretch; flex-direction: column; } }
@media (max-width: 600px) { .tab-bar { margin-left: 0; } .editor-header__actions { justify-items: start; } .editor-header, .section-heading { align-items: stretch; flex-direction: column; } .editor-card { padding: 18px; } .outcome-composer { grid-template-columns: 1fr; } }
</style>
