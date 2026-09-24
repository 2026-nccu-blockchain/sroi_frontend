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
    : "/forms";
});

const form = ref<FormResponse | null>(null);
const submissions = ref<FormSubmission[]>([]);
const selectedId = ref<string | null>(null);
const viewMode = ref<"summary" | "individual">("summary");
const loading = ref(true);
const error = ref("");

const selectedSubmission = computed(() =>
  submissions.value.find((item) => item.response_id === selectedId.value) ?? null
);
const questions = computed(() => form.value?.pages.flatMap((page) => page.questions) ?? []);
const questionById = computed(() => new Map(questions.value.map((question) => [question.question_id, question])));
const selectedAnswerByQuestion = computed(() => new Map(
  (selectedSubmission.value?.answers ?? []).map((answer) => [answer.question_id, answer])
));
const blockAnswers = computed(() => (form.value?.pages ?? []).map((page) => ({
  ...page,
  questions: page.questions.filter((question) => question.question_type !== "DS").map((question) => ({
    question,
    answer: selectedAnswerByQuestion.value.get(question.question_id) ?? null
  }))
})));

const formatDate = (value: string | null): string => value
  ? new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Taipei"
  }).format(new Date(value))
  : "尚未提交";

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

const answersForQuestion = (questionId: string): SubmittedAnswer[] =>
  submissions.value.flatMap((submission) => {
    const answer = submission.answers.find((item) => item.question_id === questionId);
    return answer ? [answer] : [];
  });

const optionStats = (question: QuestionResponse): Array<{ label: string; count: number; percent: number }> => {
  const answers = answersForQuestion(question.question_id);
  return question.options.map((option) => {
    const count = answers.filter((answer) => answer.option_ids.includes(option.option_id)).length;
    return {
      label: option.label,
      count,
      percent: submissions.value.length ? Math.round((count / submissions.value.length) * 100) : 0
    };
  });
};

const scaleStats = (question: QuestionResponse): Array<{ value: number; count: number; percent: number }> => {
  const values = answersForQuestion(question.question_id)
    .map((answer) => answer.number_value)
    .filter((value): value is number => value !== null);
  const begin = question.scale_begin ?? 1;
  const end = question.scale_end ?? 5;
  return Array.from({ length: end - begin + 1 }, (_, index) => {
    const value = begin + index;
    const count = values.filter((answer) => answer === value).length;
    return { value, count, percent: values.length ? Math.round((count / values.length) * 100) : 0 };
  });
};

const scaleAverage = (question: QuestionResponse): string => {
  const values = answersForQuestion(question.question_id)
    .map((answer) => answer.number_value)
    .filter((value): value is number => value !== null);
  if (!values.length) return "—";
  return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1);
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

        <template v-else>
          <div class="view-switch" aria-label="回覆檢視模式">
            <button type="button" :class="{ active: viewMode === 'summary' }" @click="viewMode = 'summary'">區塊統計</button>
            <button type="button" :class="{ active: viewMode === 'individual' }" @click="viewMode = 'individual'">個別回覆</button>
          </div>

          <div v-if="viewMode === 'summary'" class="block-summary-list">
            <section v-for="page in form?.pages" :key="page.page_id" class="block-summary">
              <header>
                <p class="eyebrow">成果區塊</p>
                <h2>{{ page.title || "未命名區塊" }}</h2>
                <p v-if="page.content">{{ page.content }}</p>
              </header>

              <article
                v-for="question in page.questions.filter((item) => item.question_type !== 'DS')"
                :key="question.question_id"
                class="question-summary"
              >
                <div class="question-summary__heading">
                  <h3>{{ question.title || "未命名問題" }}</h3>
                  <span>{{ answersForQuestion(question.question_id).length }} 筆回答</span>
                </div>

                <div v-if="question.question_type === 'CQ'" class="bar-chart">
                  <div v-for="stat in optionStats(question)" :key="stat.label" class="bar-row">
                    <span>{{ stat.label }}</span>
                    <div><i :style="{ width: `${stat.percent}%` }"></i></div>
                    <b>{{ stat.count }}（{{ stat.percent }}%）</b>
                  </div>
                </div>

                <div v-else-if="question.question_type === 'SC'" class="scale-summary">
                  <p>平均分數 <b>{{ scaleAverage(question) }}</b></p>
                  <div class="bar-chart">
                    <div v-for="stat in scaleStats(question)" :key="stat.value" class="bar-row">
                      <span>{{ stat.value }} 分</span>
                      <div><i :style="{ width: `${stat.percent}%` }"></i></div>
                      <b>{{ stat.count }}（{{ stat.percent }}%）</b>
                    </div>
                  </div>
                </div>

                <ul v-else class="raw-answer-list">
                  <li v-for="answer in answersForQuestion(question.question_id)" :key="answer.answer_id">
                    {{ answerText(answer) }}
                  </li>
                  <li v-if="answersForQuestion(question.question_id).length === 0">尚未收到回答</li>
                </ul>
              </article>
            </section>
          </div>

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

            <div class="answer-blocks">
              <section v-for="block in blockAnswers" :key="block.page_id" class="answer-block">
                <header>
                  <span>成果區塊</span>
                  <h3>{{ block.title || "未命名區塊" }}</h3>
                </header>
                <dl class="answer-list">
                  <div v-for="item in block.questions" :key="item.question.question_id" class="answer-item">
                    <dt>{{ item.question.title || "未命名問題" }}</dt>
                    <dd>{{ item.answer ? answerText(item.answer) : "未作答" }}</dd>
                  </div>
                </dl>
              </section>
            </div>
          </article>
          </div>
        </template>
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
.view-switch { display: flex; width: fit-content; margin: 0 0 18px; overflow: hidden; border: 1px solid #d8d0dd; border-radius: 9px; background: #fff; }
.view-switch button { min-height: 38px; padding: 0 16px; border: 0; background: #fff; color: #756e7a; font: inherit; font-size: 12px; font-weight: 650; }
.view-switch button.active { background: #765292; color: #fff; }
.block-summary-list { display: grid; gap: 20px; }
.block-summary { overflow: hidden; border: 1px solid #e2d9e7; border-radius: 12px; background: #fff; box-shadow: 0 2px 8px rgba(42, 27, 50, .04); }
.block-summary > header { padding: 24px 28px; border-bottom: 1px solid #eee8f1; background: #faf7fc; }
.block-summary > header h2 { margin-bottom: 6px; }
.block-summary > header p:last-child { margin-bottom: 0; color: #77707d; font-size: 12px; }
.question-summary { padding: 25px 28px; border-bottom: 1px solid #eeeaf0; }
.question-summary:last-child { border-bottom: 0; }
.question-summary__heading { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.question-summary__heading h3 { margin: 0; font-size: 14px; }
.question-summary__heading span { flex: none; color: #918a96; font-size: 10px; }
.bar-chart { display: grid; gap: 12px; }
.bar-row { display: grid; grid-template-columns: minmax(80px, 140px) minmax(100px, 1fr) 90px; align-items: center; gap: 12px; font-size: 11px; }
.bar-row > span { overflow-wrap: anywhere; }
.bar-row > div { height: 10px; overflow: hidden; border-radius: 6px; background: #eee9f1; }
.bar-row i { display: block; min-width: 2px; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #765292, #aa86be); }
.bar-row b { color: #6d6571; font-weight: 600; text-align: right; }
.scale-summary > p { margin-bottom: 16px; color: #6e6673; font-size: 12px; }
.scale-summary > p b { margin-left: 5px; color: #684884; font-size: 20px; }
.raw-answer-list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.raw-answer-list li { padding: 11px 13px; border-radius: 7px; background: #f8f6f9; color: #5d5662; font-size: 12px; line-height: 1.6; }
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
.answer-blocks { display: grid; gap: 22px; padding-top: 24px; }
.answer-block { overflow: hidden; border: 1px solid #e7e0ea; border-radius: 9px; }
.answer-block > header { padding: 15px 18px; border-bottom: 1px solid #ece7ee; background: #faf7fc; }
.answer-block > header span { color: #8c719f; font-size: 9px; font-weight: 700; letter-spacing: .08em; }
.answer-block > header h3 { margin: 5px 0 0; font-size: 15px; }
.answer-list { margin: 0; }
.answer-item { padding: 18px; border-bottom: 1px solid #f0edf2; }
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