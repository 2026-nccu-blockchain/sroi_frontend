<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  deleteProjectInterviewFile,
  downloadProjectInterviewFile,
  getProject,
  uploadProjectInterviewFile
} from "@/modules/workspace/api/workspace.api";
import { useProjectStore } from "@/modules/workspace/store/project.store";
import type {
  LinkedProjectForm,
  ProjectInterviewFile,
  ProjectPayload,
  WorkspaceProject
} from "@/modules/workspace/types/workspace.types";
import { monthEndIso, monthStartIso, toMonthValue } from "@/shared/utils/date";

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
const interviewFiles = ref<ProjectInterviewFile[]>([]);
const projectForms = ref<LinkedProjectForm[]>([]);
const newOutcomeName = ref("");
const uploadStakeholderId = ref("");
const currentYear = new Date().getFullYear();
const beginMonth = ref(`${currentYear}-01`);
const endMonth = ref(`${currentYear}-12`);

const draft = reactive<Omit<ProjectPayload, "begin" | "end">>({
  name: "",
  organization: "",
  description: "",
  actual_input_cost: 0,
  status: "draft",
  stakeholders: [],
  outcomes: []
});

// 已儲存（有 stakeholder_id）的利害關係人才能上傳檔案
const savedStakeholders = computed(() => draft.stakeholders.filter((item) => item.stakeholder_id));

const stakeholderName = (stakeholderId: string): string =>
  draft.stakeholders.find((item) => item.stakeholder_id === stakeholderId)?.name || "未指定";

const hydrate = (project: WorkspaceProject): void => {
  draft.name = project.name;
  draft.organization = project.organization;
  draft.description = project.description;
  draft.actual_input_cost = Number(project.actual_input_cost ?? 0);
  beginMonth.value = toMonthValue(project.begin);
  endMonth.value = toMonthValue(project.end);
  draft.status = project.status;
  draft.stakeholders = project.stakeholders.map(({ stakeholder_id, name, role, notes, pre_form_id, post_form_id }) => ({
    stakeholder_id,
    name,
    role,
    notes,
    pre_form_id: pre_form_id ?? null,
    post_form_id: post_form_id ?? null
  }));
  draft.outcomes = project.outcomes.map(({ outcome_id, name }) => ({ outcome_id, name }));
  interviewFiles.value = project.interview_files ?? [];
  projectForms.value = project.forms ?? [];
  if (!savedStakeholders.value.some((item) => item.stakeholder_id === uploadStakeholderId.value)) {
    uploadStakeholderId.value = savedStakeholders.value[0]?.stakeholder_id ?? "";
  }
};

const confirmOutcome = async (): Promise<void> => {
  const name = newOutcomeName.value.trim();
  if (!name) return;
  if (draft.outcomes.some((outcome) => outcome.name.trim().toLowerCase() === name.toLowerCase())) {
    error.value = "這個成果已經列入";
    return;
  }
  draft.outcomes.push({ name });
  newOutcomeName.value = "";
  error.value = "";
  if (!isNew.value) await persist();
};

const removeOutcome = async (index: number): Promise<void> => {
  draft.outcomes.splice(index, 1);
  if (!isNew.value) await persist();
};

const formatFileSize = (size: number): string =>
  size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(size / 1024)} KB`;

const uploadInterviewFile = async (event: Event): Promise<void> => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (!projectId.value || !uploadStakeholderId.value) {
    error.value = "請先選擇要上傳給哪位利害關係人";
    input.value = "";
    return;
  }
  uploadingInterviewFile.value = true;
  error.value = "";
  try {
    const uploaded = await uploadProjectInterviewFile(projectId.value, uploadStakeholderId.value, file);
    interviewFiles.value = [...interviewFiles.value, uploaded];
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "上傳訪綱失敗";
  } finally {
    uploadingInterviewFile.value = false;
    input.value = "";
  }
};

const downloadInterviewFile = async (file: ProjectInterviewFile): Promise<void> => {
  try {
    const blob = await downloadProjectInterviewFile(projectId.value, file.file_id);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.original_name;
    link.click();
    URL.revokeObjectURL(url);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "下載訪綱失敗";
  }
};

const removeInterviewFile = async (file: ProjectInterviewFile): Promise<void> => {
  if (!window.confirm(`確定刪除「${file.original_name}」嗎？`)) return;
  try {
    await deleteProjectInterviewFile(projectId.value, file.file_id);
    interviewFiles.value = interviewFiles.value.filter((item) => item.file_id !== file.file_id);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "刪除訪綱失敗";
  }
};

const addStakeholder = (): void => {
  draft.stakeholders.push({ name: "", role: "", notes: "", pre_form_id: null, post_form_id: null });
};

const removeStakeholder = (index: number): void => {
  const target = draft.stakeholders[index];
  const fileCount = interviewFiles.value.filter((file) => file.stakeholder_id === target.stakeholder_id).length;
  if (fileCount && !window.confirm(`「${target.name}」有 ${fileCount} 個訪綱檔案，儲存後會一併刪除，確定移除嗎？`)) return;
  draft.stakeholders.splice(index, 1);
};

const normalizedPayload = (): ProjectPayload => ({
  ...draft,
  begin: monthStartIso(beginMonth.value),
  end: monthEndIso(endMonth.value),
  name: draft.name.trim(),
  organization: draft.organization.trim(),
  description: draft.description.trim(),
  actual_input_cost: Math.max(0, Number(draft.actual_input_cost) || 0),
  stakeholders: draft.stakeholders
    .filter((item) => item.name.trim())
    .map((item) => ({
      stakeholder_id: item.stakeholder_id,
      name: item.name.trim(),
      role: item.role.trim(),
      notes: item.notes.trim(),
      pre_form_id: item.pre_form_id || null,
      post_form_id: item.post_form_id || null
    })),
  outcomes: draft.outcomes
    .filter((item) => item.name.trim())
    .map((item) => ({ outcome_id: item.outcome_id, name: item.name.trim() }))
});

const persist = async (): Promise<WorkspaceProject | null> => {
  if (!draft.name.trim()) {
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
  try {
    const project = isNew.value
      ? await projectStore.create(normalizedPayload())
      : await projectStore.update(projectId.value, normalizedPayload());
    hydrate(project);
    savedMessage.value = "專案已儲存";
    if (isNew.value) {
      await router.replace({ name: "project-edit", params: { projectId: project.project_id } });
    }
    return project;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "儲存專案失敗";
    return null;
  } finally {
    saving.value = false;
  }
};


const createProjectForm = async (): Promise<void> => {
  const project = await persist();
  if (!project) return;
  await router.push({ name: "form-builder-new", params: { projectId: project.project_id } });
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
    const cachedProject = projectStore.projects.find((item) => item.project_id === projectId.value) ?? null;
    const project = projectId.value && !cachedProject ? await getProject(projectId.value) : cachedProject;
    if (project) {
      projectStore.upsert(project);
      hydrate(project);
    }
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "無法載入專案";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="project-editor">
    <header class="editor-header">
      <div>
        <RouterLink class="back-link" to="/workspace/projects">← 返回我的專案</RouterLink>
        <p class="eyebrow">PROJECT WORKSPACE</p>
        <h1>{{ isNew ? "新增專案" : "編輯專案" }}</h1>
      </div>
      <button class="primary-button" type="button" :disabled="saving || loading" @click="persist">
        {{ saving ? "儲存中…" : "儲存專案" }}
      </button>
    </header>

    <p v-if="error" class="message message--error">{{ error }}</p>
    <p v-if="savedMessage" class="message message--success">{{ savedMessage }}</p>
    <p v-if="loading" class="message">專案載入中…</p>

    <template v-else>
      <section class="editor-card">
        <div class="section-heading">
          <div><span>01</span><h2>專案資料</h2></div>
          <p>這些資料會顯示在專案總覽。</p>
        </div>
        <div class="field-grid">
          <label class="field field--wide">專案名稱<input v-model="draft.name" maxlength="255" required /></label>
          <label class="field">所屬單位<input v-model="draft.organization" maxlength="255" /></label>
          <label class="field">開始年月<input v-model="beginMonth" type="month" required /></label>
          <label class="field">結束年月<input v-model="endMonth" type="month" :min="beginMonth" required /></label>
          <label class="field">狀態
            <select v-model="draft.status"><option value="draft">草稿</option><option value="published">已發布</option></select>
          </label>
          <label class="field">實際投入成本（NT$）
            <input v-model.number="draft.actual_input_cost" type="number" min="0" step="1" placeholder="0" />
          </label>
          <label class="field field--wide">專案說明<textarea v-model="draft.description" rows="4"></textarea></label>
        </div>
      </section>

      <section class="editor-card">
        <div class="section-heading section-heading--action">
          <div><span>02</span><h2>利害關係人</h2></div>
          <button class="secondary-button" type="button" @click="addStakeholder">＋ 新增利害關係人</button>
        </div>
        <p v-if="!draft.stakeholders.length" class="empty-state">尚未設定利害關係人。</p>
        <p v-else-if="!projectForms.length" class="form-hint">這個專案還沒有表單，請先在「專案表單」新增後，再選擇前測與後測。</p>
        <article v-for="(stakeholder, index) in draft.stakeholders" :key="index" class="stakeholder-row">
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
          <button class="remove-button" type="button" @click="removeStakeholder(index)">移除</button>
        </article>
      </section>

      <section class="editor-card">
        <div class="section-heading">
          <div><span>03</span><h2>訪綱附件</h2></div>
          <p>支援 PDF、DOC、DOCX，單一檔案上限 10 MB。</p>
        </div>
        <label class="field upload-target">上傳給利害關係人
          <select v-model="uploadStakeholderId" :disabled="!savedStakeholders.length || uploadingInterviewFile">
            <option v-if="!savedStakeholders.length" value="">請先新增並儲存利害關係人</option>
            <option v-for="item in savedStakeholders" :key="item.stakeholder_id" :value="item.stakeholder_id">
              {{ item.name }}
            </option>
          </select>
        </label>
        <label
          class="upload-zone"
          :class="{ 'upload-zone--busy': uploadingInterviewFile, 'upload-zone--disabled': !uploadStakeholderId }"
        >
          <input
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            :disabled="uploadingInterviewFile || !uploadStakeholderId"
            @change="uploadInterviewFile"
          />
          <strong>{{ uploadingInterviewFile ? "上傳中…" : "＋ 上傳訪綱" }}</strong>
          <span>可上傳訪談大綱、訪談題目或相關說明文件</span>
        </label>
        <div v-if="interviewFiles.length" class="file-list">
          <article v-for="file in interviewFiles" :key="file.file_id" class="file-row">
            <div>
              <strong>{{ file.original_name }}</strong>
              <span>{{ stakeholderName(file.stakeholder_id) }} · {{ formatFileSize(file.size_bytes) }}</span>
            </div>
            <button type="button" @click="downloadInterviewFile(file)">下載</button>
            <button type="button" @click="removeInterviewFile(file)">刪除</button>
          </article>
        </div>
        <p v-else class="empty-state">尚未上傳訪綱。</p>

        <div class="outcome-section">
          <div class="outcome-section__heading">
            <div>
              <h3>成果初列</h3>
              <p>確認後會變成 hashtag：編輯中的表單會同步，已發布的表單會保留原版本。</p>
            </div>
          </div>
          <div class="outcome-composer">
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
              :disabled="saving"
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

      <section class="editor-card">
        <div class="section-heading">
          <div><span>04</span><h2>專案表單</h2></div>
          <button class="secondary-button" type="button" :disabled="saving" @click="createProjectForm">＋ 新增表單</button>
        </div>
        <div v-for="form in projectForms" :key="form.form_id" class="linked-form-card">
          <div>
            <strong>{{ form.title || "未命名表單" }}</strong>
            <span :class="{ 'form-status--published': form.status === 'published' }">
              {{ form.status === "published" ? "已發布" : form.status === "closed" ? "已關閉" : "編輯中" }}
            </span>
          </div>
          <div class="form-actions">
            <button class="secondary-button" type="button" @click="openProjectForm(form)">編輯表單 →</button>
            <button v-if="form.status === 'published'" class="secondary-button" type="button" @click="openResponses(form)">查看回覆與結果</button>
          </div>
        </div>
        <div v-if="!projectForms.length" class="form-linker">
          <p>這個專案還沒有表單，新增時會使用上方成果 hashtag 作為預設區塊。</p>
        </div>
        <p v-if="projectForms.some((form) => form.status === 'draft')" class="form-hint">成果初列會同步到編輯中的表單；已發布的表單不會被修改。</p>
      </section>
    </template>
  </section>
</template>

<style scoped>
.project-editor { display: grid; gap: 24px; color: #161616; }
.editor-header { display: flex; align-items: end; justify-content: space-between; gap: 20px; padding-bottom: 22px; border-bottom: 2px solid #111; }
.back-link { display: inline-block; margin-bottom: 24px; color: #555; font-size: 12px; text-decoration: none; }
.eyebrow { margin: 0 0 8px; font-size: 11px; font-weight: 800; letter-spacing: .15em; }
h1, h2, h3, p { margin: 0; }
h1 { font-size: clamp(30px, 4vw, 48px); letter-spacing: -.05em; }
h2 { font-size: 20px; }
.primary-button, .secondary-button, .remove-button { min-height: 40px; border: 1px solid #111; padding: 8px 14px; background: #fff; color: #111; font: inherit; font-size: 12px; font-weight: 750; cursor: pointer; }
.primary-button { background: #111; color: #fff; }
button:disabled { cursor: not-allowed; opacity: .5; }
.message { padding: 12px 14px; border: 1px solid #ccc; }
.message--error { border-color: #bd7676; color: #8c2020; }
.message--success { border-color: #87aa8c; color: #286133; }
.editor-card { display: grid; gap: 22px; padding: 26px; border: 1px solid #d8d8d8; background: #fff; }
.section-heading { display: flex; align-items: start; justify-content: space-between; gap: 20px; padding-bottom: 18px; border-bottom: 1px solid #ddd; }
.section-heading > div { display: flex; align-items: center; gap: 12px; }
.section-heading span { color: #888; font-size: 11px; font-weight: 800; }
.section-heading p { max-width: 440px; color: #666; font-size: 12px; line-height: 1.6; }
.field-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 18px; }
.upload-target { max-width: 320px; }
.field--wide { grid-column: 1 / -1; }
.field { display: grid; gap: 7px; color: #555; font-size: 11px; font-weight: 700; }
.field input, .field select, .field textarea { width: 100%; border: 1px solid #ccc; border-radius: 0; padding: 11px 12px; background: #fff; color: #111; font: inherit; font-size: 13px; outline: none; }
.field input:focus, .field select:focus, .field textarea:focus { border-color: #111; }
.stakeholder-row { display: grid; grid-template-columns: 32px repeat(4, 1fr) 1.2fr auto; align-items: end; gap: 12px; padding-bottom: 18px; border-bottom: 1px solid #eee; }
.stakeholder-number { align-self: center; color: #999; font-size: 11px; }
.remove-button { border-color: #ccc; }
.empty-state { padding: 24px; background: #f7f7f7; color: #666; text-align: center; }
.outcome-section { display: grid; gap: 16px; margin-top: 6px; padding-top: 24px; border-top: 1px solid #ddd; }
.outcome-section__heading { display: flex; align-items: start; justify-content: space-between; gap: 20px; }
.outcome-section__heading h3 { margin-bottom: 6px; font-size: 16px; }
.outcome-section__heading p { color: #666; font-size: 11px; line-height: 1.6; }
.outcome-composer { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; }
.outcome-composer input { min-width: 0; border: 1px solid #ccc; padding: 11px 12px; background: #fff; color: #111; font: inherit; font-size: 13px; outline: none; }
.outcome-composer input:focus { border-color: #765292; box-shadow: 0 0 0 2px #eee4f3; }
.outcome-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.outcome-tags button { display: inline-flex; align-items: center; gap: 7px; border: 0; border-radius: 999px; padding: 7px 10px 7px 12px; background: #f0e8f4; color: #6d4688; font: inherit; font-size: 11px; font-weight: 700; cursor: pointer; }
.outcome-tags button b { display: grid; width: 17px; height: 17px; place-items: center; border-radius: 50%; background: #765292; color: #fff; font-size: 13px; line-height: 1; opacity: 0; transform: scale(.7); transition: opacity .15s ease, transform .15s ease; }
.outcome-tags button:hover b, .outcome-tags button:focus-visible b { opacity: 1; transform: scale(1); }
.outcome-tags button:hover { background: #e8daee; }
.upload-zone { display: grid; justify-items: center; gap: 7px; padding: 32px 20px; border: 1px dashed #a994b4; background: #faf7fc; color: #765292; cursor: pointer; }
.upload-zone input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.upload-zone strong { font-size: 13px; }
.upload-zone span { color: #817786; font-size: 11px; }
.upload-zone--busy { cursor: wait; opacity: .6; }
.upload-zone--disabled { cursor: not-allowed; opacity: .5; }
.file-list { display: grid; border-top: 1px solid #ddd; }
.file-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 12px; padding: 13px 0; border-bottom: 1px solid #eee; }
.file-row div { display: grid; min-width: 0; gap: 4px; }
.file-row strong { overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.file-row span { color: #888; font-size: 10px; }
.file-row button { border: 0; border-bottom: 1px solid #777; padding: 2px 0; background: transparent; color: #555; font-size: 11px; cursor: pointer; }
.linked-form-card { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 18px; border: 1px solid #ded6e3; background: #faf7fc; }
.linked-form-card > div:first-child { display: grid; gap: 7px; }
.linked-form-card strong { font-size: 15px; }
.linked-form-card span { width: fit-content; padding: 4px 8px; border-radius: 999px; background: #f0e8f4; color: #765292; font-size: 10px; font-weight: 700; }
.linked-form-card .form-status--published { background: #e5f3e8; color: #2f7140; }
.form-actions { display: flex; gap: 10px; }
.form-linker { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 18px; background: #f7f7f7; }
.form-linker p { color: #666; font-size: 12px; line-height: 1.6; }
.form-hint { margin: -10px 0 0; color: #7b647f; font-size: 11px; }
@media (max-width: 900px) { .field-grid, .stakeholder-row { grid-template-columns: 1fr; } .stakeholder-number { display: none; } }
@media (max-width: 700px) { .linked-form-card, .form-linker, .form-actions { align-items: stretch; flex-direction: column; } }
@media (max-width: 600px) { .editor-header, .section-heading { align-items: stretch; flex-direction: column; } .editor-card { padding: 18px; } .outcome-composer { grid-template-columns: 1fr; } }
</style>
