<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";

import { useFormStore } from "@/modules/forms/store/form.store";
import { getProject } from "@/modules/workspace/api/workspace.api";
import { useProjectStore } from "@/modules/workspace/store/project.store";
import type { ProjectPayload, WorkspaceProject } from "@/modules/workspace/types/workspace.types";

const route = useRoute();
const router = useRouter();
const formStore = useFormStore();
const projectStore = useProjectStore();
const { forms } = storeToRefs(formStore);
const projectId = computed(() => typeof route.params.projectId === "string" ? route.params.projectId : "");
const isNew = computed(() => !projectId.value);
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const savedMessage = ref("");

const draft = reactive<ProjectPayload>({
  name: "",
  organization: "",
  description: "",
  year: new Date().getFullYear(),
  status: "draft",
  linked_form_id: null,
  stakeholders: []
});
const linkedForm = computed(() =>
  forms.value.find((form) => form.form_id === draft.linked_form_id) ?? null
);

const hydrate = (project: WorkspaceProject): void => {
  draft.name = project.name;
  draft.organization = project.organization;
  draft.description = project.description;
  draft.year = project.year;
  draft.status = project.status;
  draft.linked_form_id = project.linked_form_id ?? null;
  draft.stakeholders = project.stakeholders.map(({ name, role, email, notes }) => ({
    name,
    role,
    email: email ?? "",
    notes
  }));
};

const addStakeholder = (): void => {
  draft.stakeholders.push({ name: "", role: "", email: "", notes: "" });
};

const removeStakeholder = (index: number): void => {
  draft.stakeholders.splice(index, 1);
};

const normalizedPayload = (): ProjectPayload => ({
  ...draft,
  name: draft.name.trim(),
  organization: draft.organization.trim(),
  description: draft.description.trim(),
  linked_form_id: draft.linked_form_id || null,
  stakeholders: draft.stakeholders
    .filter((item) => item.name.trim())
    .map((item) => ({
      name: item.name.trim(),
      role: item.role.trim(),
      email: item.email?.trim() || null,
      notes: item.notes.trim()
    }))
});

const persist = async (): Promise<WorkspaceProject | null> => {
  if (!draft.name.trim()) {
    error.value = "請輸入專案名稱";
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

/*const createAndLinkForm = async (): Promise<void> => {
  const project = await persist();
  if (!project) return;
  await router.push({ name: "form-builder-new", params: { projectId: project.project_id } });
};
*/

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

const openLinkedForm = async (): Promise<void> => {
  if (!draft.linked_form_id) return;
  await router.push({
    name: "form-builder-edit",
    params: { projectId: projectId.value, formId: draft.linked_form_id }
  });
};

const openResponses = async (): Promise<void> => {
  if (!draft.linked_form_id) return;
  await router.push({
    name: "form-responses",
    params: { projectId: projectId.value, formId: draft.linked_form_id }
  });
};

onMounted(async () => {
  loading.value = true;
  error.value = "";
  try {
    const cachedProject = projectStore.projects.find((item) => item.project_id === projectId.value) ?? null;
    const [, project] = await Promise.all([
      formStore.ensureLoaded(),
      projectId.value && !cachedProject ? getProject(projectId.value) : Promise.resolve(cachedProject)
    ]);
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
          <label class="field">年度<input v-model.number="draft.year" type="number" min="1900" max="2200" /></label>
          <label class="field">狀態
            <select v-model="draft.status"><option value="draft">草稿</option><option value="published">已發布</option></select>
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
        <article v-for="(stakeholder, index) in draft.stakeholders" :key="index" class="stakeholder-row">
          <span class="stakeholder-number">{{ String(index + 1).padStart(2, "0") }}</span>
          <label class="field">名稱<input v-model="stakeholder.name" placeholder="例：計畫參與者" required /></label>
          <label class="field">關係／類型<input v-model="stakeholder.role" placeholder="例：受益人" /></label>
          <label class="field">電子郵件<input v-model="stakeholder.email" type="email" placeholder="name@example.com" /></label>
          <label class="field field--notes">備註<input v-model="stakeholder.notes" /></label>
          <button class="remove-button" type="button" @click="removeStakeholder(index)">移除</button>
        </article>
      </section>

      <section class="editor-card">
        <div class="section-heading">
          <div><span>03</span><h2>專案表單</h2></div>
          <p>連結後可直接從專案進入該表單編輯。</p>
        </div>
        <div class="form-linker">
          <label class="field">選擇現有表單
            <select v-model="draft.linked_form_id">
              <option :value="null">尚未連結</option>
              <option v-for="form in forms" :key="form.form_id" :value="form.form_id">
                {{ form.title || "未命名表單" }}（{{ form.status === "published" ? "已發布" : "草稿" }}）
              </option>
            </select>
          </label>
          <button v-if="draft.linked_form_id" class="secondary-button" type="button" @click="openLinkedForm">編輯連結表單 →</button>
          <button v-if="linkedForm?.status === 'published'" class="secondary-button" type="button" @click="openResponses">查看回覆與結果</button>
          <button v-if="!draft.linked_form_id" class="secondary-button" type="button" :disabled="saving" @click="createAndLinkForm">建立新表單並連結</button>
        </div>
        <p v-if="linkedForm?.status === 'draft'" class="form-hint">表單仍在編輯中，發布後才會開放填答與回覆結果。</p>
      </section>
    </template>
  </section>
</template>

<style scoped>
.project-editor { display: grid; gap: 24px; color: #161616; }
.editor-header { display: flex; align-items: end; justify-content: space-between; gap: 20px; padding-bottom: 22px; border-bottom: 2px solid #111; }
.back-link { display: inline-block; margin-bottom: 24px; color: #555; font-size: 12px; text-decoration: none; }
.eyebrow { margin: 0 0 8px; font-size: 11px; font-weight: 800; letter-spacing: .15em; }
h1, h2, p { margin: 0; }
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
.field--wide { grid-column: 1 / -1; }
.field { display: grid; gap: 7px; color: #555; font-size: 11px; font-weight: 700; }
.field input, .field select, .field textarea { width: 100%; border: 1px solid #ccc; border-radius: 0; padding: 11px 12px; background: #fff; color: #111; font: inherit; font-size: 13px; outline: none; }
.field input:focus, .field select:focus, .field textarea:focus { border-color: #111; }
.stakeholder-row { display: grid; grid-template-columns: 32px repeat(3, 1fr) 1.2fr auto; align-items: end; gap: 12px; padding-bottom: 18px; border-bottom: 1px solid #eee; }
.stakeholder-number { align-self: center; color: #999; font-size: 11px; }
.remove-button { border-color: #ccc; }
.empty-state { padding: 24px; background: #f7f7f7; color: #666; text-align: center; }
.form-linker { display: grid; grid-template-columns: minmax(240px, 1fr) repeat(3, auto); align-items: end; gap: 12px; }
.form-hint { margin: -10px 0 0; color: #7b647f; font-size: 11px; }
@media (max-width: 900px) { .field-grid, .stakeholder-row, .form-linker { grid-template-columns: 1fr; } .stakeholder-number { display: none; } }
@media (max-width: 600px) { .editor-header, .section-heading { align-items: stretch; flex-direction: column; } .editor-card { padding: 18px; } }
</style>
