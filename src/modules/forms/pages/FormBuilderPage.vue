<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useAuth } from "@/modules/auth/composables/useAuth";
import {
  createPage,
  createForm,
  createQuestion as createQuestionApi,
  deletePage,
  deleteQuestion as deleteQuestionApi,
  getForm,
  saveFormStructure,
  updatePage,
  updateForm,
  updateQuestion
} from "@/modules/forms/api/forms.api";
import type {
  ApiQuestionType,
  FormResponse,
  QuestionPayload,
  QuestionResponse
} from "@/modules/forms/types/form.types";
import { HttpError } from "@/shared/api/http";

type QuestionType = "description" | "text" | "scale" | "date" | "choice";

interface QuestionOption {
  id?: string;
  label: string;
}

interface Question {
  id: string;
  pageId: string;
  title: string;
  type: QuestionType;
  required: boolean;
  options: QuestionOption[];
  scaleBegin: number;
  scaleEnd: number;
  isMultiple: boolean;
  isTemp: boolean;
}

interface Block {
  id: string;
  title: string;
  content: string;
}

const route = useRoute();
const router = useRouter();
const { isAuthenticated } = useAuth();
const formId = ref("");
const blocks = ref<Block[]>([]);
const activeBlockId = ref("");
const formTitle = ref("未命名表單");
const formDescription = ref("");
const activeQuestionId = ref("");
const saved = ref(false);
const saving = ref(false);
const initializing = ref(true);
const saveError = ref("");
const validationIssues = ref<string[]>([]);
const showToast = ref(false);
const publishedLink = ref("");
const draggedQuestionId = ref<string | null>(null);
const dragOverQuestionId = ref<string | null>(null);
let saveTimer: number | undefined;
let activeSave: Promise<void> | null = null;
let pendingSave = false;

const questionTypes: { value: QuestionType; label: string; icon: string }[] = [
  { value: "description", label: "題目敘述", icon: "T" },
  { value: "text", label: "問答題", icon: "☰" },
  { value: "scale", label: "量表", icon: "⌁" },
  { value: "date", label: "日期", icon: "□" },
  { value: "choice", label: "選擇題", icon: "◉" }
];

const questions = ref<Question[]>([]);

const typeToApi: Record<QuestionType, ApiQuestionType> = {
  description: "DS",
  text: "OQ",
  scale: "SC",
  date: "DT",
  choice: "CQ"
};

const apiToType: Record<ApiQuestionType, QuestionType> = {
  DS: "description",
  OQ: "text",
  SC: "scale",
  DT: "date",
  CQ: "choice"
};

const toPayload = (question: Question, position: number): QuestionPayload => ({
  question_type: typeToApi[question.type],
  title: question.type === "description" ? null : question.title,
  content: question.type === "description" ? question.title : "",
  is_required: question.type === "description" ? false : question.required,
  position,
  scale_begin: question.type === "scale" ? question.scaleBegin : null,
  scale_end: question.type === "scale" ? question.scaleEnd : null,
  is_multiple: question.type === "choice" ? question.isMultiple : false,
  options: question.type === "choice"
    ? question.options.map((option, index) => ({ option_id: option.id, label: option.label, value: option.label, position: index }))
    : []
});

const fromResponse = (question: QuestionResponse): Question => ({
  id: question.question_id,
  pageId: question.page_id,
  title: question.question_type === "DS" ? question.content : question.title ?? "",
  type: apiToType[question.question_type],
  required: question.is_required,
  options: question.options.map((option) => ({ id: option.option_id, label: option.label })),
  scaleBegin: question.scale_begin ?? 1,
  scaleEnd: question.scale_end ?? 5,
  isMultiple: question.is_multiple,
  isTemp: question.is_temp
});

const hydrate = (form: FormResponse): void => {
  formId.value = form.form_id;
  formTitle.value = form.title ?? "未命名表單";
  formDescription.value = form.content ?? "";
  blocks.value = form.pages.map((page) => ({
    id: page.page_id,
    title: page.title ?? "未命名區塊",
    content: page.content
  }));
  questions.value = form.pages.flatMap((page) => page.questions.map(fromResponse));
  activeBlockId.value = blocks.value[0]?.id ?? "";
  activeQuestionId.value = questions.value[0]?.id ?? "";
  publishedLink.value = form.status === "published" && form.public_token
    ? `${window.location.origin}/forms/${form.public_token}`
    : "";
};

const initializeForm = async (): Promise<void> => {
  if (!isAuthenticated.value) {
    await router.replace({ name: "login", query: { redirect: route.fullPath } });
    return;
  }

  try {
    const requestedFormId = String(route.params.formId ?? "");
    if (requestedFormId) {
      hydrate(await getForm(requestedFormId));
      saved.value = true;
      return;
    }

    const created = await createForm({
      title: formTitle.value,
      content: formDescription.value,
      status: "draft",
      pages: [{ title: "未命名區塊", content: "", position: 0, questions: [] }]
    });
    hydrate(created);
    saved.value = true;
    await router.replace({ name: "form-builder-edit", params: { formId: created.form_id } });
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : "無法連接後端";
    if (error instanceof HttpError && error.status === 401) {
      window.localStorage.removeItem("sroi.auth.user");
      await router.replace({ name: "login", query: { redirect: route.fullPath } });
    }
  } finally {
    initializing.value = false;
  }
};

const persistDraft = (): Promise<void> => {
  if (!formId.value) return Promise.resolve();
  if (activeSave) {
    pendingSave = true;
    return activeSave.then(() => pendingSave ? persistDraft() : undefined);
  }

  pendingSave = false;
  saving.value = true;
  saveError.value = "";
  activeSave = (async () => {
    try {
      await updateForm(formId.value, { title: formTitle.value, content: formDescription.value });
      await Promise.all(blocks.value.map((block, index) =>
        updatePage(block.id, { title: block.title, content: block.content, position: index })
      ));
      await Promise.all(blocks.value.flatMap((block) =>
        questions.value.filter((question) => question.pageId === block.id).map((question, index) =>
          updateQuestion(question.id, toPayload(question, index))
        )
      ));
      await saveFormStructure(formId.value, blocks.value.map((block) => ({
        page_id: block.id,
        question_ids: questions.value
          .filter((question) => question.pageId === block.id)
          .map((question) => question.id)
      })));
      saved.value = true;
    } catch (error) {
      saveError.value = error instanceof Error ? error.message : "儲存失敗";
      saved.value = false;
    } finally {
      saving.value = false;
      activeSave = null;
    }
  })();
  return activeSave;
};

const touch = (): void => {
  saved.value = false;
  pendingSave = true;
  saveError.value = "";
  validationIssues.value = [];
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void persistDraft(), 700);
};

const questionsForBlock = (blockId: string): Question[] =>
  questions.value.filter((question) => question.pageId === blockId);

const addQuestion = async (blockId = activeBlockId.value): Promise<void> => {
  if (!formId.value || !blockId) return;
  try {
    const position = questionsForBlock(blockId).length;
    const response = await createQuestionApi(formId.value, blockId, {
      question_type: "OQ",
      title: "未命名問題",
      content: "",
      is_required: false,
      position,
      scale_begin: null,
      scale_end: null,
      is_multiple: false,
      options: []
    });
    const question = fromResponse(response);
    questions.value.push(question);
    activeBlockId.value = blockId;
    activeQuestionId.value = question.id;
    saved.value = true;
    await nextTick();
    document.getElementById(`question-${question.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : "新增題目失敗";
  }
};

const removeQuestion = async (id: string): Promise<void> => {
  const index = questions.value.findIndex((question) => question.id === id);
  try {
    await deleteQuestionApi(id);
    questions.value.splice(index, 1);
    activeQuestionId.value = questions.value[Math.max(0, index - 1)]?.id ?? "";
    touch();
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : "刪除題目失敗";
  }
};

const duplicateQuestion = async (question: Question): Promise<void> => {
  if (!formId.value || !question.pageId) return;
  const blockQuestions = questionsForBlock(question.pageId);
  const blockIndex = blockQuestions.findIndex((item) => item.id === question.id);
  const globalIndex = questions.value.findIndex((item) => item.id === question.id);
  try {
    const response = await createQuestionApi(formId.value, question.pageId, toPayload(question, blockIndex + 1));
    const copy = fromResponse(response);
    questions.value.splice(globalIndex + 1, 0, copy);
    activeQuestionId.value = copy.id;
    touch();
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : "複製題目失敗";
  }
};

const changeType = (question: Question): void => {
  if (question.type === "choice" && question.options.length === 0) {
    question.options = [{ label: "選項 1" }, { label: "選項 2" }];
  }
  if (question.type !== "choice") {
    question.options = [];
    question.isMultiple = false;
  }
  touch();
};

const addOption = (question: Question): void => {
  question.options.push({ label: `選項 ${question.options.length + 1}` });
  touch();
};

const addBlock = async (): Promise<void> => {
  if (!formId.value) return;
  try {
    const page = await createPage(formId.value, {
      title: `區塊 ${blocks.value.length + 1}`,
      content: "",
      position: blocks.value.length,
      questions: []
    });
    blocks.value.push({ id: page.page_id, title: page.title ?? "未命名區塊", content: page.content });
    activeBlockId.value = page.page_id;
    saved.value = true;
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : "新增區塊失敗";
  }
};

const removeBlock = async (blockId: string): Promise<void> => {
  if (blocks.value.length <= 1) return;
  try {
    await deletePage(blockId);
    blocks.value = blocks.value.filter((block) => block.id !== blockId);
    questions.value = questions.value.filter((question) => question.pageId !== blockId);
    activeBlockId.value = blocks.value[0]?.id ?? "";
    saved.value = true;
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : "刪除區塊失敗";
  }
};

const moveQuestion = (questionId: string, offset: -1 | 1): void => {
  const question = questions.value.find((item) => item.id === questionId);
  if (!question) return;
  const blockQuestions = questionsForBlock(question.pageId);
  const fromBlockIndex = blockQuestions.findIndex((item) => item.id === questionId);
  const target = blockQuestions[fromBlockIndex + offset];
  if (!target) return;
  const fromIndex = questions.value.findIndex((item) => item.id === questionId);
  const toIndex = questions.value.findIndex((item) => item.id === target.id);
  questions.value.splice(fromIndex, 1);
  questions.value.splice(toIndex, 0, question);
  activeQuestionId.value = questionId;
  touch();
};

const startQuestionDrag = (event: DragEvent, questionId: string): void => {
  draggedQuestionId.value = questionId;
  event.dataTransfer?.setData("text/plain", questionId);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
};

const dropQuestion = (targetQuestionId: string): void => {
  const sourceQuestionId = draggedQuestionId.value;
  if (!sourceQuestionId || sourceQuestionId === targetQuestionId) {
    dragOverQuestionId.value = null;
    return;
  }

  const fromIndex = questions.value.findIndex((question) => question.id === sourceQuestionId);
  const targetIndex = questions.value.findIndex((question) => question.id === targetQuestionId);
  if (fromIndex < 0 || targetIndex < 0) return;
  const [question] = questions.value.splice(fromIndex, 1);
  const targetQuestion = questions.value.find((item) => item.id === targetQuestionId);
  if (targetQuestion) {
    question.pageId = targetQuestion.pageId;
    activeBlockId.value = targetQuestion.pageId;
  }
  const insertIndex = fromIndex < targetIndex ? targetIndex : targetIndex;
  questions.value.splice(insertIndex, 0, question);
  activeQuestionId.value = sourceQuestionId;
  draggedQuestionId.value = null;
  dragOverQuestionId.value = null;
  touch();
};

const endQuestionDrag = (): void => {
  draggedQuestionId.value = null;
  dragOverQuestionId.value = null;
};

const publishIssues = (): string[] => {
  const issues: string[] = [];
  if (!formTitle.value.trim() || formTitle.value.trim() === "未命名表單") {
    issues.push("請完成表單名稱");
  }
  for (const [blockIndex, block] of blocks.value.entries()) {
    const blockName = block.title.trim();
    const blockLabel = blockName || `區塊 ${blockIndex + 1}`;
    if (!blockName || blockName === "未命名區塊" || /^區塊 \d+$/.test(blockName)) {
      issues.push(`請完成第 ${blockIndex + 1} 個關鍵精神區塊的名稱`);
    }
    const blockQuestions = questionsForBlock(block.id);
    if (!blockQuestions.some((question) => question.type !== "description")) {
      issues.push(`「${blockLabel}」至少需要一個可填答的問題`);
    }
    for (const [questionIndex, question] of blockQuestions.entries()) {
      const questionLabel = `「${blockLabel}」第 ${questionIndex + 1} 題`;
      if (!question.title.trim() || question.title.trim() === "未命名問題") {
        issues.push(`${questionLabel}尚未完成題目內容`);
      }
      if (question.type === "choice") {
        if (!question.options.length || question.options.some((option) => !option.label.trim())) {
          issues.push(`${questionLabel}的選項尚未完成`);
        }
      }
    }
  }
  return issues;
};

const publish = async (): Promise<void> => {
  validationIssues.value = publishIssues();
  if (validationIssues.value.length) {
    saveError.value = "發布前請先完成以下內容";
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  window.clearTimeout(saveTimer);
  await persistDraft();
  if (!formId.value || saveError.value) return;
  try {
    const structured = await saveFormStructure(formId.value, blocks.value.map((block) => ({
      page_id: block.id,
      question_ids: questionsForBlock(block.id).map((question) => question.id)
    })));
    const published = await updateForm(formId.value, { status: "published" });
    hydrate({ ...structured, status: published.status, public_token: published.public_token });
    await copyPublishedLink();
    showToast.value = true;
    window.setTimeout(() => (showToast.value = false), 2400);
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : "發布失敗";
  }
};

const copyPublishedLink = async (): Promise<void> => {
  if (!publishedLink.value) return;
  try {
    await navigator.clipboard.writeText(publishedLink.value);
  } catch {
    // The link remains visible when clipboard permission is unavailable.
  }
};

const openResponses = async (): Promise<void> => {
  if (!formId.value) return;
  window.clearTimeout(saveTimer);
  if (!saved.value) await persistDraft();
  if (saveError.value) return;
  await router.push({ name: "form-responses", params: { formId: formId.value }, query: { from: route.fullPath } });
};

onMounted(() => void initializeForm());
</script>

<template>
  <div class="builder-shell">
    <header class="topbar">
      <div class="topbar__left">
        <button class="icon-button icon-button--back" type="button" aria-label="返回" @click="router.push('/')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <div class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></div>
        <div class="document-meta">
          <input v-model="formTitle" class="document-meta__title" aria-label="表單名稱" @input="touch" />
          <span class="document-meta__status" :class="{ 'document-meta__status--error': saveError }">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18a4.6 4.6 0 0 1-.4-9.2A6 6 0 0 1 18.1 8a4 4 0 0 1-.1 8H7Z" /><path d="m9.5 13 1.7 1.7 3.5-4" /></svg>
            {{ saveError || (initializing ? "載入中…" : saving ? "儲存中…" : saved ? "已儲存" : "尚未儲存") }}
          </span>
        </div>
      </div>

      <div class="topbar__actions">
        <button class="icon-button hide-mobile" type="button" aria-label="自訂主題" title="自訂主題">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h5a4 4 0 0 0 4-4c0-3.3-4-6-9-6Z" /><circle cx="7.5" cy="10" r="1" /><circle cx="10" cy="6.5" r="1" /><circle cx="15" cy="7" r="1" /></svg>
        </button>
        <button class="icon-button hide-mobile" type="button" aria-label="預覽" title="預覽">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.7" /></svg>
        </button>
        <button class="publish-button" type="button" :disabled="initializing || saving" @click="publish">
          發布 <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 14-7-4 14-3-6-7-1Z" /></svg>
        </button>
        <button class="avatar-button" type="button" aria-label="帳號選單">J</button>
      </div>
    </header>

    <nav class="tabs" aria-label="表單功能">
      <button class="tabs__item tabs__item--active" type="button">問題</button>
      <button class="tabs__item" type="button" :disabled="initializing || !formId" @click="openResponses">回覆</button>
      <button class="tabs__item" type="button">設定</button>
    </nav>

    <main class="workspace">
      <div class="form-canvas">
        <p v-if="saveError" class="connection-error" role="alert">{{ saveError }}</p>
        <section v-if="validationIssues.length" class="validation-reminder" role="alert">
          <strong>表單還沒有完成</strong>
          <p>內容不會被刪除，請完成後再發布：</p>
          <ul>
            <li v-for="issue in validationIssues" :key="issue">{{ issue }}</li>
          </ul>
        </section>
        <section v-if="publishedLink" class="share-link">
          <div>
            <strong>公開填答連結</strong>
            <a :href="publishedLink" target="_blank" rel="noopener">{{ publishedLink }}</a>
          </div>
          <button type="button" @click="copyPublishedLink">複製連結</button>
        </section>
        <section class="form-heading">
          <div class="form-heading__accent"></div>
          <label>
            <span class="sr-only">表單標題</span>
            <textarea v-model="formTitle" rows="1" class="form-heading__title" @input="touch"></textarea>
          </label>
          <label>
            <span class="sr-only">表單說明</span>
            <textarea v-model="formDescription" rows="2" class="form-heading__description" placeholder="表單說明" @input="touch"></textarea>
          </label>
        </section>

        <section
          v-for="(block, blockIndex) in blocks"
          :key="block.id"
          class="block-editor"
          :class="{ 'block-editor--active': activeBlockId === block.id }"
          @click="activeBlockId = block.id"
        >
          <header class="block-editor__header">
            <div>
              <span>成果區塊 {{ blockIndex + 1 }}</span>
              <input v-model="block.title" aria-label="區塊名稱" placeholder="例如：同理心" @input="touch" />
              <textarea v-model="block.content" rows="1" aria-label="區塊說明" placeholder="說明這個區塊評估的能力" @input="touch"></textarea>
            </div>
            <button type="button" :disabled="blocks.length === 1" @click.stop="removeBlock(block.id)">刪除區塊</button>
          </header>

        <section
          v-for="(question, index) in questionsForBlock(block.id)"
          :id="`question-${question.id}`"
          :key="question.id"
          class="question-card"
          :class="{
            'question-card--active': activeQuestionId === question.id,
            'question-card--dragging': draggedQuestionId === question.id,
            'question-card--drag-over': dragOverQuestionId === question.id && draggedQuestionId !== question.id
          }"
          @dragover.prevent="dragOverQuestionId = question.id"
          @dragleave="dragOverQuestionId === question.id && (dragOverQuestionId = null)"
          @drop.prevent="dropQuestion(question.id)"
          @click="activeQuestionId = question.id"
        >
          <button
            class="drag-handle"
            type="button"
            draggable="true"
            aria-label="拖曳以調整題目順序"
            title="拖曳以排序"
            @dragstart.stop="startQuestionDrag($event, question.id)"
            @dragend="endQuestionDrag"
          >⠿</button>

          <div class="question-card__top">
            <div class="question-title-wrap">
              <span class="question-number">{{ index + 1 }}.</span>
              <input v-model="question.title" class="question-title" aria-label="問題標題" @input="touch" />
              <span v-if="question.required" class="required-mark">＊</span>
            </div>

            <label class="type-select">
              <span class="type-select__icon">{{ questionTypes.find((item) => item.value === question.type)?.icon }}</span>
              <select v-model="question.type" aria-label="題型" @change="changeType(question)">
                <option v-for="type in questionTypes" :key="type.value" :value="type.value">{{ type.label }}</option>
              </select>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4" /></svg>
            </label>
          </div>

          <div class="answer-area">
            <div v-if="question.type === 'description'" class="description-preview">
              此區塊只顯示說明文字，不需要填答者回答。
            </div>
            <div v-else-if="question.type === 'text'" class="text-preview">填答者的文字回答</div>
            <div v-else-if="question.type === 'scale'" class="scale-preview">
              <span class="scale-preview__label">非常不同意</span>
              <label v-for="score in 5" :key="score">
                <span>{{ score }}</span>
                <i></i>
              </label>
              <span class="scale-preview__label">非常同意</span>
            </div>
            <div v-else-if="question.type === 'date'" class="date-preview">
              <span>年 / 月 / 日</span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4m8-4v4M4 10h16" /></svg>
            </div>
            <template v-else>
              <div v-for="(option, optionIndex) in question.options" :key="option.id ?? optionIndex" class="option-row">
                <span :class="question.isMultiple ? 'option-box' : 'option-circle'"></span>
                <input v-model="option.label" :aria-label="`選項 ${optionIndex + 1}`" @input="touch" />
                <button v-if="question.options.length > 1" class="remove-option" type="button" aria-label="刪除選項" @click.stop="question.options.splice(optionIndex, 1); touch()">×</button>
              </div>
              <button class="add-option" type="button" @click.stop="addOption(question)">＋ 新增選項</button>
            </template>
          </div>

          <footer v-if="activeQuestionId === question.id" class="question-card__footer">
            <button class="footer-icon" type="button" aria-label="上移問題" title="上移" :disabled="index === 0" @click.stop="moveQuestion(question.id, -1)">↑</button>
            <button class="footer-icon" type="button" aria-label="下移問題" title="下移" :disabled="index === questionsForBlock(block.id).length - 1" @click.stop="moveQuestion(question.id, 1)">↓</button>
            <button class="footer-icon" type="button" aria-label="複製問題" title="複製" @click.stop="duplicateQuestion(question)">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="1.5" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h3" /></svg>
            </button>
            <button class="footer-icon" type="button" aria-label="刪除問題" title="刪除" @click.stop="removeQuestion(question.id)">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" /></svg>
            </button>
            <span v-if="question.type !== 'description'" class="footer-divider"></span>
            <label v-if="question.type === 'choice'" class="required-toggle">
              多選
              <input v-model="question.isMultiple" type="checkbox" @change="touch" />
              <span></span>
            </label>
            <label v-if="question.type !== 'description'" class="required-toggle">
              必填
              <input v-model="question.required" type="checkbox" @change="touch" />
              <span></span>
            </label>
            <button class="footer-icon" type="button" aria-label="更多選項">•••</button>
          </footer>
        </section>

          <section v-if="questionsForBlock(block.id).length === 0" class="empty-questions">
            <strong>這個區塊還沒有題目</strong>
            <p>加入用來評估「{{ block.title || '這項能力' }}」的問題。</p>
            <button type="button" @click.stop="addQuestion(block.id)">＋ 新增第一題</button>
          </section>

          <button class="block-add-question" type="button" @click.stop="addQuestion(block.id)">＋ 在此區塊新增問題</button>
        </section>

        <button class="add-block" type="button" @click="addBlock">＋ 新增成果區塊</button>
        <button class="mobile-add" type="button" @click="addQuestion()">＋ 新增問題</button>
        <p class="canvas-footer">請勿透過表單提交密碼或其他機密資訊。</p>
      </div>

      <aside class="floating-tools" aria-label="新增表單內容">
        <button type="button" title="新增問題" @click="addQuestion()">＋</button>
        <button type="button" title="匯入問題">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11v5h3v11H8v-3H5V4Z" /><path d="M8 7h8v10H8V7Zm4 3v4m-2-2h4" /></svg>
        </button>
        <button type="button" title="新增標題和說明">T<span>T</span></button>
        <button type="button" title="新增圖片">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m4 17 5-5 3 3 2-2 6 5" /></svg>
        </button>
        <button type="button" title="新增區塊" @click="addBlock">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="1" /><path d="M4 9h16M9 4v5" /></svg>
        </button>
      </aside>
    </main>

    <Transition name="toast">
      <div v-if="showToast" class="toast">表單已發布！分享連結已建立。</div>
    </Transition>
  </div>
</template>

<style scoped>
.builder-shell {
  min-height: 100vh;
  color: #292631;
  background: #f7f5fa;
  font-family: Inter, "Noto Sans TC", "PingFang TC", system-ui, sans-serif;
}

button,
input,
textarea,
select { font: inherit; }

svg { fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8; }

.topbar {
  position: sticky;
  z-index: 20;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72px;
  padding: 0 28px;
  border-bottom: 1px solid #eeeaf2;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(12px);
}

.topbar__left,
.topbar__actions { display: flex; align-items: center; gap: 10px; }

.icon-button {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #5b5663;
}

.icon-button:hover { background: #f4f0f7; color: #6f4b8b; }
.icon-button svg { width: 22px; height: 22px; }

.brand-mark {
  display: grid;
  grid-template-columns: repeat(3, 5px);
  align-content: end;
  gap: 3px;
  width: 38px;
  height: 38px;
  padding: 8px;
  border-radius: 9px;
  background: linear-gradient(145deg, #7e57a4, #5d357e);
  box-shadow: 0 5px 14px rgba(94, 53, 126, 0.24);
}

.brand-mark span { display: block; border-radius: 2px; background: #fff; }
.brand-mark span:nth-child(1) { height: 8px; }
.brand-mark span:nth-child(2) { height: 14px; }
.brand-mark span:nth-child(3) { height: 20px; }

.document-meta { display: grid; gap: 3px; margin-left: 4px; }
.document-meta__title { width: min(320px, 28vw); border: 0; border-bottom: 1px solid transparent; outline: 0; color: #292631; font-size: 15px; font-weight: 650; }
.document-meta__title:focus { border-color: #72508c; }
.document-meta__status { display: flex; align-items: center; gap: 5px; color: #8b8690; font-size: 11px; }
.document-meta__status--error { color: #a43f55; }
.document-meta__status svg { width: 15px; height: 15px; }

.publish-button {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  margin-left: 4px;
  padding: 0 18px;
  border: 0;
  border-radius: 9px;
  background: #694786;
  box-shadow: 0 3px 10px rgba(84, 47, 114, 0.22);
  color: #fff;
  font-size: 13px;
  font-weight: 650;
}

.publish-button:hover { background: #593674; transform: translateY(-1px); }
.publish-button:disabled { cursor: wait; opacity: .55; transform: none; }
.publish-button svg { width: 17px; height: 17px; }
.avatar-button { width: 38px; height: 38px; margin-left: 5px; border: 0; border-radius: 50%; background: #e8d9ef; color: #62407b; font-weight: 700; }

.tabs {
  position: sticky;
  z-index: 19;
  top: 72px;
  display: flex;
  justify-content: center;
  height: 48px;
  gap: 34px;
  border-bottom: 1px solid #ece8ef;
  background: rgba(255, 255, 255, 0.96);
}

.tabs__item { position: relative; border: 0; background: none; color: #77717e; font-size: 13px; font-weight: 600; }
.tabs__item span { display: inline-grid; min-width: 19px; height: 19px; margin-left: 4px; place-items: center; border-radius: 10px; background: #eee9f1; font-size: 10px; }
.tabs__item--active { color: #684884; }
.tabs__item--active::after { content: ""; position: absolute; right: 0; bottom: 0; left: 0; height: 3px; border-radius: 3px 3px 0 0; background: #765292; }

.workspace { position: relative; width: min(820px, calc(100% - 48px)); margin: 0 auto; padding: 30px 58px 70px 0; }
.form-canvas { display: grid; gap: 14px; }
.connection-error { margin: 0; padding: 12px 16px; border: 1px solid #e4b8c2; border-radius: 9px; background: #fff4f6; color: #91374a; font-size: 12px; }
.validation-reminder { padding: 18px 20px; border: 1px solid #e2b45e; border-radius: 10px; background: #fffaf0; color: #6f5122; }
.validation-reminder strong { font-size: 14px; }
.validation-reminder p { margin: 6px 0 10px; font-size: 11px; }
.validation-reminder ul { display: grid; gap: 5px; margin: 0; padding-left: 20px; font-size: 11px; line-height: 1.5; }
.share-link { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 15px 18px; border: 1px solid #d8c9e1; border-radius: 10px; background: #fdfaff; }
.share-link div { display: grid; min-width: 0; gap: 4px; }
.share-link strong { color: #55475f; font-size: 11px; }
.share-link a { overflow: hidden; color: #765292; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.share-link button { flex: 0 0 auto; min-height: 34px; padding: 0 13px; border: 0; border-radius: 7px; background: #765292; color: #fff; font-size: 11px; font-weight: 650; }
.block-editor { display: grid; gap: 14px; padding: 14px; border: 1px solid #ddd3e3; border-radius: 15px; background: #f3edf7; transition: border-color 150ms ease, box-shadow 150ms ease; }
.block-editor--active { border-color: #a488b7; box-shadow: 0 4px 18px rgba(75, 48, 91, .08); }
.block-editor__header { display: flex; align-items: start; justify-content: space-between; gap: 20px; padding: 16px 18px; }
.block-editor__header > div { display: grid; min-width: 0; flex: 1; gap: 7px; }
.block-editor__header span { color: #806493; font-size: 9px; font-weight: 750; letter-spacing: .12em; }
.block-editor__header input, .block-editor__header textarea { width: 100%; resize: none; border: 0; border-bottom: 1px solid transparent; outline: 0; background: transparent; color: #382f3e; }
.block-editor__header input { font-size: 19px; font-weight: 700; }
.block-editor__header textarea { color: #756b79; font-size: 11px; }
.block-editor__header input:focus, .block-editor__header textarea:focus { border-bottom-color: #9879ad; }
.block-editor__header > button { border: 0; background: transparent; color: #9a5160; font-size: 10px; }
.block-editor__header > button:disabled { opacity: .35; }
.empty-questions { display: grid; justify-items: center; gap: 8px; padding: 42px 24px; border: 1px dashed #c9b8d3; border-radius: 12px; background: #fdfbfe; color: #5f5664; text-align: center; }
.empty-questions p { margin: 0; color: #8a818e; font-size: 12px; }
.empty-questions button { min-height: 40px; margin-top: 8px; padding: 0 18px; border: 0; border-radius: 8px; background: #765292; color: #fff; font-weight: 650; }
.block-add-question { justify-self: center; border: 0; padding: 4px 0; border-bottom: 1px solid #9273a5; background: transparent; color: #765292; font-size: 11px; }
.add-block { min-height: 54px; border: 1px dashed #aa94b8; border-radius: 11px; background: #faf7fc; color: #6c4788; font-size: 13px; font-weight: 700; }
.form-heading,
.question-card { position: relative; border: 1px solid #e8e3eb; border-radius: 12px; background: #fff; box-shadow: 0 2px 7px rgba(42, 27, 50, 0.035); }

.form-heading { overflow: hidden; padding: 34px 36px 28px; }
.form-heading__accent { position: absolute; top: 0; right: 0; left: 0; height: 9px; background: linear-gradient(90deg, #6c4788, #9b76b4); }
.form-heading label { display: block; }
.form-heading textarea { width: 100%; resize: none; border: 0; outline: 0; color: inherit; }
.form-heading__title { padding: 0 0 12px; border-bottom: 1px solid #e1dce4 !important; font-size: clamp(24px, 4vw, 32px) !important; font-weight: 720 !important; letter-spacing: -0.035em; line-height: 1.25; }
.form-heading__title:focus { border-color: #765292 !important; }
.form-heading__description { margin-top: 17px; color: #706a74 !important; font-size: 13px !important; line-height: 1.7; }

.question-card { padding: 31px 30px 0; transition: box-shadow 160ms ease, border-color 160ms ease; }
.question-card--active { border-color: #d8cbe1; box-shadow: 0 5px 22px rgba(57, 35, 67, 0.08); }
.question-card--dragging { opacity: .48; }
.question-card--drag-over { border-color: #765292; box-shadow: 0 0 0 2px rgba(118, 82, 146, .16); }
.question-card--active::before { content: ""; position: absolute; top: 0; bottom: 0; left: 0; width: 5px; border-radius: 12px 0 0 12px; background: #765292; }
.drag-handle { position: absolute; top: 3px; left: 50%; width: 34px; height: 22px; transform: translateX(-50%) rotate(90deg); border: 0; background: transparent; color: #bbb4bf; font-size: 19px; line-height: 1; cursor: grab; }
.drag-handle:active { cursor: grabbing; }
.question-card__top { display: grid; grid-template-columns: minmax(0, 1fr) 180px; align-items: start; gap: 22px; }
.question-title-wrap { display: flex; align-items: baseline; border-bottom: 1px solid transparent; }
.question-card--active .question-title-wrap { border-bottom-color: #e1dce4; }
.question-number { flex: 0 0 auto; margin-right: 8px; color: #45404a; font-size: 14px; font-weight: 650; }
.question-title { min-width: 0; width: 100%; padding: 4px 0 12px; border: 0; outline: 0; color: #353039; background: transparent; font-size: 14px; font-weight: 600; }
.required-mark { color: #b1485c; font-size: 13px; }

.type-select { position: relative; display: flex; align-items: center; height: 42px; border: 1px solid #ddd7e1; border-radius: 8px; background: #fff; color: #645e69; }
.type-select__icon { width: 40px; color: #706179; text-align: center; font-size: 16px; }
.type-select select { width: 100%; height: 100%; appearance: none; border: 0; outline: 0; background: transparent; color: inherit; font-size: 12px; cursor: pointer; }
.type-select svg { width: 16px; height: 16px; margin-right: 12px; pointer-events: none; }
.answer-area { min-height: 78px; padding: 27px 0 25px 26px; }
.text-preview { width: 100%; padding: 0 0 22px; border-bottom: 1px dotted #bbb5be; color: #aaa4ad; font-size: 12px; }
.text-preview--short { width: 58%; }
.description-preview { padding: 15px 17px; border-left: 3px solid #aa8dbd; border-radius: 0 7px 7px 0; background: #f8f4fa; color: #77707b; font-size: 12px; line-height: 1.7; }
.scale-preview { display: flex; align-items: flex-end; justify-content: center; gap: clamp(10px, 3vw, 24px); padding: 8px 0; }
.scale-preview label { display: grid; justify-items: center; gap: 9px; color: #6d6671; font-size: 11px; }
.scale-preview i { display: block; width: 18px; height: 18px; border: 1.5px solid #aaa3ad; border-radius: 50%; }
.scale-preview__label { max-width: 58px; padding-bottom: 2px; color: #918a95; font-size: 10px; line-height: 1.4; text-align: center; }
.date-preview { display: flex; width: 160px; justify-content: space-between; padding: 0 0 8px; border-bottom: 1px solid #c9c3cc; color: #aaa4ad; font-size: 12px; }
.date-preview svg { width: 17px; height: 17px; }
.option-row { display: flex; align-items: center; min-height: 38px; gap: 11px; }
.option-row input { min-width: 0; flex: 1; padding: 7px 2px; border: 0; border-bottom: 1px solid transparent; outline: 0; color: #5a545e; font-size: 13px; }
.option-row input:focus { border-bottom-color: #84629e; }
.option-circle { display: grid; flex: 0 0 17px; width: 17px; height: 17px; place-items: center; border: 1.5px solid #aaa3ad; border-radius: 50%; color: #837b87; font-size: 11px; }
.option-box { flex: 0 0 17px; width: 17px; height: 17px; border: 1.5px solid #aaa3ad; border-radius: 3px; font-size: 0; }
.remove-option { opacity: 0; border: 0; background: transparent; color: #9e97a1; font-size: 22px; }
.option-row:hover .remove-option { opacity: 1; }
.add-option { margin: 9px 0 0 26px; border: 0; border-bottom: 1px solid #b69fc5; padding: 3px 0; background: transparent; color: #72508d; font-size: 12px; }

.question-card__footer { display: flex; align-items: center; justify-content: flex-end; min-height: 60px; border-top: 1px solid #eeeaf0; gap: 4px; }
.footer-icon { display: grid; width: 38px; height: 38px; place-items: center; border: 0; border-radius: 50%; background: transparent; color: #726c76; font-size: 13px; }
.footer-icon:hover { background: #f4f0f6; }
.footer-icon:disabled { opacity: .3; }
.footer-icon svg { width: 19px; height: 19px; }
.footer-divider { width: 1px; height: 28px; margin: 0 9px; background: #e3dee6; }
.required-toggle { display: flex; align-items: center; gap: 10px; margin-right: 8px; color: #59535e; font-size: 12px; cursor: pointer; }
.required-toggle input { position: absolute; opacity: 0; pointer-events: none; }
.required-toggle span { position: relative; width: 35px; height: 20px; border-radius: 12px; background: #d6d1d9; transition: background 150ms ease; }
.required-toggle span::after { content: ""; position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.18); transition: transform 150ms ease; }
.required-toggle input:checked + span { background: #765292; }
.required-toggle input:checked + span::after { transform: translateX(15px); }

.floating-tools { position: fixed; top: 178px; left: calc(50% + 351px); display: grid; overflow: hidden; border: 1px solid #e1dce4; border-radius: 12px; background: #fff; box-shadow: 0 5px 18px rgba(48, 32, 56, .1); }
.floating-tools button { display: grid; width: 47px; height: 47px; place-items: center; border: 0; border-bottom: 1px solid #eeeaf0; background: #fff; color: #6d6671; font-size: 24px; }
.floating-tools button:last-child { border-bottom: 0; }
.floating-tools button:hover { background: #f5f0f7; color: #6c4788; }
.floating-tools svg { width: 20px; height: 20px; }
.floating-tools button:nth-child(3) { font-family: Georgia, serif; font-size: 17px; font-weight: 700; }
.floating-tools button:nth-child(3) span { font-size: 10px; }
.mobile-add { display: none; }
.canvas-footer { margin: 12px 0 0; color: #aaa4ad; font-size: 10px; text-align: center; }
.toast { position: fixed; z-index: 50; right: 28px; bottom: 28px; padding: 15px 20px; border-radius: 9px; background: #32273a; box-shadow: 0 8px 30px rgba(25, 16, 30, .25); color: #fff; font-size: 13px; }
.toast-enter-active, .toast-leave-active { transition: opacity .2s ease, transform .2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }

@media (max-width: 840px) {
  .topbar { padding: 0 14px; }
  .icon-button--back { display: none; }
  .document-meta__status { display: none; }
  .workspace { width: min(700px, calc(100% - 28px)); padding-right: 0; }
  .floating-tools { display: none; }
  .mobile-add { display: block; width: 100%; height: 48px; border: 1px dashed #bcaac8; border-radius: 10px; background: #fdfcff; color: #6c4788; font-size: 13px; font-weight: 650; }
}

@media (max-width: 600px) {
  .topbar { height: 64px; }
  .tabs { top: 64px; }
  .hide-mobile, .avatar-button { display: none; }
  .brand-mark { width: 34px; height: 34px; }
  .document-meta__title { width: 150px; }
  .publish-button { padding: 0 13px; }
  .workspace { padding-top: 18px; }
  .form-heading { padding: 28px 22px 22px; }
  .question-card { padding: 29px 20px 0; }
  .question-card__top { grid-template-columns: 1fr; gap: 14px; }
  .type-select { width: 100%; }
  .answer-area { padding-left: 2px; }
  .text-preview--short { width: 80%; }
}
</style>
