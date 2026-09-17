<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useAuth } from "@/modules/auth/composables/useAuth";
import { getForm, getFormSubmissions } from "@/modules/forms/api/forms.api";
import type {
  FormResponse,
  FormSubmission,
  QuestionResponse,
  SubmittedAnswer
} from "@/modules/forms/types/form.types";
import { HttpError } from "@/shared/api/http";

const route = useRoute();
const router = useRouter();
const { logout } = useAuth();
const formId = computed(() => String(route.params.formId ?? ""));
const returnPath = computed(() => {
  const from = route.query.from;
  return typeof from === "string" && from.startsWith("/") && !from.startsWith("//")
    ? from
    : "/forms/new";
});

const form = ref<FormResponse | null>(null);
const submissions = ref<FormSubmission[]>([]);
const selectedId = ref<string | null>(null);
const loading = ref(true);
const error = ref("");

const selectedSubmission = computed(() =>
  submissions.value.find((item) => item.response_id === selectedId.value) ?? null
);
const questions = computed(() => form.value?.pages.flatMap((page) => page.questions) ?? []);
const questionById = computed(() => new Map(questions.value.map((question) => [question.question_id, question])));
const questionOrder = computed(() => new Map(questions.value.map((question, index) => [question.question_id, index])));
const orderedAnswers = computed(() => [...(selectedSubmission.value?.answers ?? [])].sort((a, b) =>
  (questionOrder.value.get(a.question_id) ?? Number.MAX_SAFE_INTEGER)
  - (questionOrder.value.get(b.question_id) ?? Number.MAX_SAFE_INTEGER)
));

const formatDate = (value: string | null): string => value
  ? new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Taipei"
  }).format(new Date(value))
  : "尚未提交";

const questionTitle = (answer: SubmittedAnswer): string =>
  questionById.value.get(answer.question_id)?.title || `已刪除的題目（${answer.question_id}）`;

const answerText = (answer: SubmittedAnswer): string => {
  if (answer.option_ids.length > 0) {
    const question: QuestionResponse | undefined = questionById.value.get(answer.question_id);
    return answer.option_ids.map((optionId) =>
      question?.options.find((option) => option.option_id === optionId)?.label
      ?? `已刪除的選項（${optionId}）`
    ).join("、");
  }
  if (answer.number_value !== null) return String(answer.number_value);
  if (answer.date_value) return answer.date_value;
  return answer.content?.trim() || "未作答";
};

const load = async (): Promise<void> => {
  loading.value = true;
  error.value = "";
  try {
    const [loadedForm, loadedSubmissions] = await Promise.all([
      getForm(formId.value),
      getFormSubmissions(formId.value)
    ]);
    form.value = loadedForm;
    submissions.value = loadedSubmissions;
    selectedId.value = loadedSubmissions[0]?.response_id ?? null;
  } catch (caught) {
    if (caught instanceof HttpError && caught.status === 401) {
      logout();
      await router.replace({ name: "login", query: { redirect: route.fullPath } });
      return;
    }
    error.value = caught instanceof Error ? caught.message : "無法載入回覆資料";
  } finally {
    loading.value = false;
  }
};

watch(formId, () => void load(), { immediate: true });
</script>

<template>
  <div class="responses-shell">
    <header class="responses-topbar">
      <RouterLink class="back-link" :to="returnPath">← 返回表單</RouterLink>
      <strong>{{ form?.title || "表單回覆" }}</strong>
    </header>

    <nav class="tabs" aria-label="表單功能">
      <RouterLink :to="returnPath">問題</RouterLink>
      <span class="tabs__active">回覆 <b>{{ submissions.length }}</b></span>
    </nav>

    <main class="responses-main">
      <p v-if="loading" class="state-card">正在載入回覆…</p>
      <p v-else-if="error" class="state-card state-card--error" role="alert">{{ error }}</p>
      <template v-else>
        <div class="page-heading">
          <div>
            <p class="eyebrow">FORM RESPONSES</p>
            <h1>回覆</h1>
            <p>這份表單目前有 {{ submissions.length }} 筆回覆。</p>
          </div>
        </div>

        <section v-if="submissions.length === 0" class="state-card empty-state">
          <span aria-hidden="true">✉</span>
          <h2>尚未收到回覆</h2>
          <p>分享已發布的表單連結後，填答紀錄會出現在這裡。</p>
        </section>

        <div v-else class="responses-layout">
          <aside class="response-list" aria-label="歷次回覆">
            <button
              v-for="(submission, index) in submissions"
              :key="submission.response_id"
              type="button"
              class="response-list__item"
              :class="{ 'response-list__item--active': selectedId === submission.response_id }"
              :aria-current="selectedId === submission.response_id ? 'true' : undefined"
              @click="selectedId = submission.response_id"
            >
              <strong>回覆 {{ submissions.length - index }}</strong>
              <span>{{ submission.respondent_email || "匿名填答" }}</span>
              <small>{{ formatDate(submission.submitted_at) }}</small>
            </button>
          </aside>

          <article v-if="selectedSubmission" class="response-detail">
            <header class="response-detail__header">
              <div>
                <p class="eyebrow">SUBMISSION</p>
                <h2>{{ selectedSubmission.respondent_email || "匿名填答" }}</h2>
                <p>{{ formatDate(selectedSubmission.submitted_at) }} 提交</p>
              </div>
              <span class="status-pill">{{ selectedSubmission.status === "submitted" ? "已提交" : "草稿" }}</span>
            </header>

            <div v-if="orderedAnswers.length === 0" class="empty-answers">這筆回覆沒有答案。</div>
            <dl v-else class="answer-list">
              <div v-for="answer in orderedAnswers" :key="answer.answer_id" class="answer-item">
                <dt>{{ questionTitle(answer) }}</dt>
                <dd>{{ answerText(answer) }}</dd>
              </div>
            </dl>
          </article>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.responses-shell { min-height: 100vh; background: #f7f5fa; color: #292631; font-family: Inter, "Noto Sans TC", "PingFang TC", system-ui, sans-serif; }
.responses-topbar { display: flex; align-items: center; gap: 24px; min-height: 72px; padding: 0 32px; border-bottom: 1px solid #eeeaf2; background: #fff; }
.responses-topbar strong { overflow: hidden; font-size: 15px; text-overflow: ellipsis; white-space: nowrap; }
.back-link { flex: none; color: #684884; font-size: 13px; font-weight: 650; text-decoration: none; }
.back-link:hover { text-decoration: underline; }
.tabs { display: flex; justify-content: center; align-items: stretch; gap: 34px; height: 48px; border-bottom: 1px solid #ece8ef; background: #fff; font-size: 13px; font-weight: 650; }
.tabs a, .tabs__active { display: flex; align-items: center; gap: 6px; padding: 0 4px; color: #77717e; text-decoration: none; }
.tabs__active { border-bottom: 3px solid #765292; color: #684884; }
.tabs b { display: inline-grid; min-width: 21px; height: 21px; place-items: center; border-radius: 12px; background: #eee9f1; font-size: 11px; }
.responses-main { width: min(980px, calc(100% - 40px)); margin: 0 auto; padding: 36px 0 72px; }
.page-heading { margin-bottom: 22px; }
.eyebrow { margin: 0 0 8px; color: #856b99; font-size: 10px; font-weight: 750; letter-spacing: .13em; }
h1, h2, p { margin-top: 0; }
.page-heading h1 { margin-bottom: 6px; font-size: 26px; }
.page-heading p:last-child, .response-detail__header p:last-child { margin-bottom: 0; color: #817b88; font-size: 13px; }
.state-card, .response-list, .response-detail { border: 1px solid #e8e3eb; border-radius: 12px; background: #fff; box-shadow: 0 2px 8px rgba(42, 27, 50, .04); }
.state-card { padding: 35px; text-align: center; }
.state-card--error { color: #a43f55; }
.empty-state { padding: 70px 24px; }
.empty-state span { color: #8e70a5; font-size: 36px; }
.empty-state h2 { margin: 12px 0 8px; font-size: 20px; }
.empty-state p { margin-bottom: 0; color: #817b88; font-size: 13px; }
.responses-layout { display: grid; grid-template-columns: minmax(215px, 280px) minmax(0, 1fr); align-items: start; gap: 18px; }
.response-list { display: grid; overflow: hidden; }
.response-list__item { display: grid; gap: 5px; width: 100%; padding: 18px 20px; border: 0; border-bottom: 1px solid #eeeaf0; background: #fff; color: #292631; text-align: left; cursor: pointer; }
.response-list__item:last-child { border-bottom: 0; }
.response-list__item:hover { background: #faf8fc; }
.response-list__item--active { border-left: 4px solid #765292; padding-left: 16px; background: #f9f5fc; }
.response-list__item strong { font-size: 14px; }
.response-list__item span { overflow: hidden; color: #635d69; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.response-list__item small { color: #918a96; font-size: 11px; }
.response-detail { min-height: 310px; padding: 28px 30px; }
.response-detail__header { display: flex; align-items: start; justify-content: space-between; gap: 12px; padding-bottom: 22px; border-bottom: 1px solid #eeeaf0; }
.response-detail__header h2 { margin-bottom: 6px; font-size: 19px; overflow-wrap: anywhere; }
.status-pill { flex: none; padding: 6px 10px; border-radius: 20px; background: #edf7ef; color: #327c48; font-size: 11px; font-weight: 700; }
.answer-list { margin: 0; }
.answer-item { padding: 21px 0; border-bottom: 1px solid #f0edf2; }
.answer-item:last-child { border-bottom: 0; }
.answer-item dt { margin-bottom: 8px; color: #5d5664; font-size: 13px; font-weight: 650; }
.answer-item dd { margin: 0; color: #292631; font-size: 15px; line-height: 1.6; overflow-wrap: anywhere; white-space: pre-wrap; }
.empty-answers { padding-top: 24px; color: #817b88; font-size: 13px; }
@media (max-width: 720px) {
  .responses-topbar { padding: 0 18px; }
  .responses-main { width: min(100% - 28px, 560px); padding-top: 24px; }
  .responses-layout { grid-template-columns: 1fr; }
  .response-list { max-height: 270px; overflow-y: auto; }
  .response-detail { padding: 24px 20px; }
}
</style>
