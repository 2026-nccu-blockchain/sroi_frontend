<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";

import { getPublicForm, submitPublicForm } from "@/modules/forms/api/forms.api";
import type { AnswerPayload, PublicFormResponse, QuestionResponse } from "@/modules/forms/types/form.types";

const route = useRoute();
const form = ref<PublicFormResponse | null>(null);
const loading = ref(true);
const submitting = ref(false);
const submitted = ref(false);
const emailVerified = ref(false);
const error = ref("");
const email = ref("");
const answers = reactive<Record<string, string | number | string[]>>({});
const shuffledQuestions = ref<QuestionResponse[]>([]);

const publicToken = computed(() => String(route.params.publicToken ?? ""));
const allQuestions = computed(() => form.value?.pages.flatMap((page) => page.questions) ?? []);
const questions = computed(() => emailVerified.value ? shuffledQuestions.value : allQuestions.value);

const seededShuffle = (items: QuestionResponse[], seedText: string): QuestionResponse[] => {
  let seed = 2166136261;
  for (const character of seedText) {
    seed ^= character.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  const random = (): number => {
    seed += 0x6D2B79F5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
};

const load = async (): Promise<void> => {
  try {
    form.value = await getPublicForm(publicToken.value);
    for (const question of form.value.pages.flatMap((page) => page.questions)) {
      if (question.question_type === "CQ" && question.is_multiple) {
        answers[question.question_id] = [];
      }
    }
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "找不到這份表單";
  } finally {
    loading.value = false;
  }
};

const answerPayload = (question: QuestionResponse): AnswerPayload => {
  const value = answers[question.question_id];
  if (question.question_type === "OQ") return { question_id: question.question_id, text_value: String(value ?? "") };
  if (question.question_type === "SC") return { question_id: question.question_id, number_value: Number(value) };
  if (question.question_type === "DT") return { question_id: question.question_id, date_value: String(value ?? "") };
  const optionIds = Array.isArray(value) ? value : value ? [String(value)] : [];
  return { question_id: question.question_id, option_ids: optionIds };
};

const hasAnswer = (question: QuestionResponse): boolean => {
  const value = answers[question.question_id];
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim() !== "";
  return value !== undefined;
};

const verifyEmail = (): void => {
  email.value = email.value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    error.value = "請輸入有效的 Email";
    return;
  }
  error.value = "";
  shuffledQuestions.value = seededShuffle(
    allQuestions.value,
    `${publicToken.value}:${email.value}`
  );
  emailVerified.value = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const submit = async (): Promise<void> => {
  error.value = "";
  const missingRequired = questions.value.find((question) =>
    question.question_type !== "DS" && question.is_required && !hasAnswer(question)
  );
  if (missingRequired) {
    error.value = `請回答必填問題：${missingRequired.title ?? "未命名問題"}`;
    return;
  }
  submitting.value = true;
  try {
    const answeredQuestions = questions.value.filter((question) =>
      question.question_type !== "DS" && hasAnswer(question)
    );
    await submitPublicForm(publicToken.value, email.value, answeredQuestions.map(answerPayload));
    submitted.value = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "送出失敗，請稍後再試";
  } finally {
    submitting.value = false;
  }
};

onMounted(() => void load());
</script>

<template>
  <main class="public-shell">
    <div class="public-form">
      <section v-if="loading" class="state-card">表單載入中…</section>
      <section v-else-if="error && !form" class="state-card state-card--error">{{ error }}</section>
      <section v-else-if="submitted" class="state-card state-card--success">
        <span>✓</span>
        <h1>已收到你的回覆</h1>
        <p>感謝你撥空完成這份表單。</p>
      </section>

      <template v-else-if="form">
        <header class="public-heading">
          <div class="public-heading__accent"></div>
          <p class="eyebrow">SROI FORM</p>
          <h1>{{ form.title }}</h1>
          <p>{{ form.content }}</p>
          <small><b>*</b> 表示必填問題</small>
        </header>

        <form v-if="!emailVerified" class="email-step" @submit.prevent="verifyEmail">
          <section class="answer-card respondent-card">
            <p class="step-label">開始填寫前</p>
            <h2>請先驗證你的 Email <b>*</b></h2>
            <p class="email-hint">Email 會和這次回覆一起保存，請確認格式正確。</p>
            <label class="sr-only" for="respondent-email">Email</label>
            <input
              id="respondent-email"
              v-model="email"
              type="email"
              autocomplete="email"
              placeholder="name@example.com"
              required
            />
          </section>
          <p v-if="error" class="submit-error" role="alert">{{ error }}</p>
          <button class="submit-button" type="submit">驗證並開始填寫</button>
        </form>

        <form v-else @submit.prevent="submit">
          <section class="email-confirmed">
            <span>填答 Email：{{ email }}</span>
            <button type="button" @click="emailVerified = false">更換</button>
          </section>

          <template v-for="(question, index) in questions" :key="question.question_id">
            <section v-if="question.question_type === 'DS'" class="description-card">
              <p>{{ question.content }}</p>
            </section>

            <section v-else class="answer-card">
              <h2>{{ index + 1 }}. {{ question.title }} <b v-if="question.is_required">*</b></h2>

              <textarea
                v-if="question.question_type === 'OQ'"
                v-model="answers[question.question_id]"
                rows="3"
                placeholder="請輸入你的回答"
                :required="question.is_required"
              ></textarea>

              <div v-else-if="question.question_type === 'SC'" class="scale-answer">
                <label v-for="score in (question.scale_end ?? 5) - (question.scale_begin ?? 1) + 1" :key="score">
                  <span>{{ score + (question.scale_begin ?? 1) - 1 }}</span>
                  <input
                    v-model.number="answers[question.question_id]"
                    type="radio"
                    :name="question.question_id"
                    :value="score + (question.scale_begin ?? 1) - 1"
                    :required="question.is_required"
                  />
                </label>
              </div>

              <input
                v-else-if="question.question_type === 'DT'"
                v-model="answers[question.question_id]"
                type="date"
                :required="question.is_required"
              />

              <div v-else class="choice-answer">
                <label v-for="option in question.options" :key="option.option_id">
                  <input
                    v-model="answers[question.question_id]"
                    :type="question.is_multiple ? 'checkbox' : 'radio'"
                    :name="question.question_id"
                    :value="option.option_id"
                    :required="question.is_required && !question.is_multiple"
                  />
                  {{ option.label }}
                </label>
                <small v-if="question.is_multiple">可複選</small>
              </div>
            </section>
          </template>

          <p v-if="error" class="submit-error" role="alert">{{ error }}</p>
          <button class="submit-button" type="submit" :disabled="submitting">
            {{ submitting ? "送出中…" : "送出表單" }}
          </button>
        </form>
      </template>
    </div>
  </main>
</template>

<style scoped>
.public-shell { min-height: 100vh; padding: 42px 18px 80px; background: #f4f0f7; color: #302b34; font-family: Inter, "Noto Sans TC", "PingFang TC", system-ui, sans-serif; }
.public-form { display: grid; width: min(680px, 100%); margin: 0 auto; gap: 14px; }
.public-heading, .answer-card, .description-card, .state-card { position: relative; overflow: hidden; padding: 30px 34px; border: 1px solid #e3dce8; border-radius: 12px; background: #fff; box-shadow: 0 3px 14px rgba(50, 35, 60, .05); }
.public-heading__accent { position: absolute; top: 0; right: 0; left: 0; height: 9px; background: linear-gradient(90deg, #684486, #a27cba); }
.eyebrow { margin: 7px 0 12px !important; color: #765292 !important; font-size: 10px !important; font-weight: 750; letter-spacing: .16em; }
.public-heading h1 { margin: 0 0 12px; font-size: clamp(26px, 5vw, 36px); letter-spacing: -.035em; }
.public-heading p { margin: 0; color: #6f6873; font-size: 13px; line-height: 1.7; }
.public-heading small { display: block; margin-top: 22px; color: #99929c; font-size: 10px; }
.public-heading b, .answer-card h2 b { color: #b1485c; }
form { display: grid; gap: 14px; }
.answer-card h2 { margin: 0 0 24px; font-size: 14px; font-weight: 650; line-height: 1.6; }
.answer-card textarea, .answer-card > input { width: 100%; padding: 10px 2px; resize: vertical; border: 0; border-bottom: 1px solid #bcb5c0; border-radius: 0; outline: 0; color: inherit; }
.answer-card textarea:focus, .answer-card > input:focus { border-color: #765292; border-bottom-width: 2px; }
.description-card { border-left: 5px solid #83609c; color: #69616e; font-size: 13px; line-height: 1.8; }
.description-card p { margin: 0; }
.scale-answer { display: flex; justify-content: center; gap: clamp(18px, 6vw, 48px); }
.scale-answer label { display: grid; justify-items: center; gap: 10px; color: #716a75; font-size: 12px; }
.scale-answer input, .choice-answer input { accent-color: #765292; }
.choice-answer { display: grid; gap: 17px; }
.choice-answer label { display: flex; align-items: center; gap: 10px; color: #5f5863; font-size: 13px; }
.respondent-card { display: grid; gap: 8px; }
.respondent-card label { font-size: 12px; font-weight: 650; }
.step-label { margin: 0 0 6px; color: #765292; font-size: 11px; font-weight: 700; }
.email-hint { margin: -12px 0 14px; color: #817986; font-size: 12px; line-height: 1.6; }
.email-confirmed { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border: 1px solid #dcd1e2; border-radius: 9px; background: #faf7fc; color: #665d6b; font-size: 12px; }
.email-confirmed button { border: 0; background: transparent; color: #765292; font-weight: 650; }
.choice-answer small { color: #918996; font-size: 10px; }
.submit-button { justify-self: start; min-height: 44px; padding: 0 24px; border: 0; border-radius: 8px; background: #694786; color: #fff; font-weight: 650; }
.submit-button:disabled { cursor: wait; opacity: .55; }
.submit-error { margin: 0; padding: 13px 16px; border-radius: 8px; background: #fff0f3; color: #943c50; font-size: 12px; }
.state-card { text-align: center; }
.state-card--error { color: #943c50; }
.state-card--success { padding: 60px 30px; }
.state-card--success span { display: inline-grid; width: 48px; height: 48px; place-items: center; border-radius: 50%; background: #e5f1e8; color: #3d7550; font-size: 22px; }
.state-card--success h1 { margin: 20px 0 8px; }
.state-card--success p { margin: 0; color: #79727c; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
@media (max-width: 560px) { .public-shell { padding-top: 18px; } .public-heading, .answer-card, .description-card { padding: 25px 22px; } }
</style>
