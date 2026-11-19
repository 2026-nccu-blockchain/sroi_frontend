<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";

import { checkPublicFormEmail, getPublicForm, submitPublicForm } from "@/modules/forms/api/forms.api";
import type { AnswerPayload, PublicFormResponse, QuestionResponse } from "@/modules/forms/types/form.types";
import DateInput from "@/shared/components/DateInput.vue";

const route = useRoute();
const form = ref<PublicFormResponse | null>(null);
const loading = ref(true);
const submitting = ref(false);
const checkingEmail = ref(false);
const submitted = ref(false);
const declined = ref(false);
const consentAccepted = ref(false);
const hasReadConsent = ref(false);
const participantAgreed = ref(false);
const participantName = ref("");
const ageStatus = ref<"" | "adult" | "minor">("");
const guardianName = ref("");
const guardianRelationship = ref("");
const guardianAgreed = ref(false);
const secondaryUseAgreed = ref(false);
const emailVerified = ref(false);
const error = ref("");
const email = ref("");
const answers = reactive<Record<string, string | number | string[]>>({});
const shuffledQuestions = ref<QuestionResponse[]>([]);
const currentOutcomePageIndex = ref(0);

const publicToken = computed(() => String(route.params.publicToken ?? ""));
const allQuestions = computed(() => form.value?.pages.flatMap((page) => page.questions) ?? []);
const respondentPage = computed(() => form.value?.pages.find((page) => page.is_respondent_info) ?? null);
const basicQuestions = computed(() => respondentPage.value?.questions ?? []);
const outcomePages = computed(() => form.value?.pages.filter((page) => !page.is_respondent_info) ?? []);
const outcomeQuestions = computed(() => outcomePages.value.flatMap((page) => page.questions));
const isBlockByBlock = computed(() => form.value?.shuffle_outcome_questions === false);
const currentOutcomePage = computed(() => outcomePages.value[currentOutcomePageIndex.value] ?? null);
const questions = computed(() => {
  if (!emailVerified.value) return outcomeQuestions.value;
  if (!isBlockByBlock.value) return shuffledQuestions.value;
  return currentOutcomePage.value?.questions ?? [];
});
const submissionQuestions = computed(() => [...basicQuestions.value, ...outcomeQuestions.value]);

const acceptConsent = (): void => {
  const consent = form.value?.consent;
  error.value = "";
  if (!consent || !hasReadConsent.value || !participantAgreed.value) {
    error.value = "請閱讀同意書並確認同意參與後再繼續。";
    return;
  }
  if (!participantName.value.trim()) {
    error.value = "請輸入參與者姓名作為電子簽署。";
    return;
  }
  if (consent.requires_guardian && !ageStatus.value) {
    error.value = "請選擇參與者是否已滿 18 歲。";
    return;
  }
  if (consent.requires_guardian && ageStatus.value === "minor") {
    if (!guardianName.value.trim() || !guardianRelationship.value.trim() || !guardianAgreed.value) {
      error.value = "未滿 18 歲的參與者需要完成法定代理人資料與同意。";
      return;
    }
  }
  consentAccepted.value = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const declineConsent = (): void => {
  declined.value = true;
  error.value = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
};

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

const verifyEmail = async (): Promise<void> => {
  email.value = email.value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    error.value = "請輸入有效的電子郵件";
    return;
  }
  const missingBasic = basicQuestions.value.find((question) =>
    question.question_type !== "DS" && question.is_required && !hasAnswer(question)
  );
  if (missingBasic) {
    error.value = `請填寫必填基本資料：${missingBasic.title ?? "未命名問題"}`;
    return;
  }
  checkingEmail.value = true;
  error.value = "";
  try {
    const availability = await checkPublicFormEmail(publicToken.value, email.value);
    if (!availability.can_submit) {
      error.value = "這個電子郵件已填寫過此表單，不能重複填寫。";
      return;
    }
    shuffledQuestions.value = form.value?.shuffle_outcome_questions
      ? seededShuffle(outcomeQuestions.value, `${publicToken.value}:${email.value}`)
      : [...outcomeQuestions.value];
    currentOutcomePageIndex.value = 0;
    emailVerified.value = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "無法驗證電子郵件，請稍後再試";
  } finally {
    checkingEmail.value = false;
  }
};

const submit = async (): Promise<void> => {
  error.value = "";
  const missingRequired = submissionQuestions.value.find((question) =>
    question.question_type !== "DS" && question.is_required && !hasAnswer(question)
  );
  if (missingRequired) {
    error.value = `請回答必填問題：${missingRequired.title ?? "未命名問題"}`;
    return;
  }
  submitting.value = true;
  try {
    const answeredQuestions = submissionQuestions.value.filter((question) =>
      question.question_type !== "DS" && hasAnswer(question)
    );
    const consentDocument = form.value?.consent;
    if (!consentDocument) throw new Error("這份問卷尚未設定知情同意書");
    await submitPublicForm(
      publicToken.value,
      email.value,
      answeredQuestions.map(answerPayload),
      {
        consent_id: consentDocument.consent_id,
        participant_name: participantName.value.trim(),
        participant_agreed: participantAgreed.value,
        secondary_use_agreed: consentDocument.secondary_use_enabled && secondaryUseAgreed.value,
        is_adult: consentDocument.requires_guardian ? ageStatus.value === "adult" : true,
        guardian_name: ageStatus.value === "minor" ? guardianName.value.trim() : null,
        guardian_relationship: ageStatus.value === "minor" ? guardianRelationship.value.trim() : null,
        guardian_agreed: ageStatus.value === "minor" ? guardianAgreed.value : null
      }
    );
    submitted.value = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "送出失敗，請稍後再試";
  } finally {
    submitting.value = false;
  }
};

const currentPageHasMissingRequired = (): QuestionResponse | undefined =>
  questions.value.find((question) =>
    question.question_type !== "DS" && question.is_required && !hasAnswer(question)
  );

const goToPreviousBlock = (): void => {
  if (currentOutcomePageIndex.value <= 0) return;
  currentOutcomePageIndex.value -= 1;
  error.value = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const submitOrContinue = async (): Promise<void> => {
  if (isBlockByBlock.value && currentOutcomePageIndex.value < outcomePages.value.length - 1) {
    const missingRequired = currentPageHasMissingRequired();
    if (missingRequired) {
      error.value = `請回答必填問題：${missingRequired.title ?? "未命名問題"}`;
      return;
    }
    currentOutcomePageIndex.value += 1;
    error.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  await submit();
};

const changeEmail = (): void => {
  emailVerified.value = false;
  currentOutcomePageIndex.value = 0;
  error.value = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
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
      <section v-else-if="declined" class="state-card state-card--declined">
        <h1>你已選擇不參與</h1>
        <p>本次不會建立問卷回覆，也不會保存你尚未送出的填答資料。</p>
      </section>

      <template v-else-if="form">
        <header class="public-heading">
          <div class="public-heading__accent"></div>
          <p class="eyebrow">問卷填答</p>
          <h1>{{ form.title }}</h1>
          <p>{{ form.content }}</p>
          <small><b>*</b> 表示必填問題</small>
        </header>

        <form v-if="!consentAccepted" class="consent-step" @submit.prevent="acceptConsent">
          <section class="consent-card">
            <div class="consent-card__heading">
              <p class="eyebrow">填答前請先閱讀</p>
              <h2>{{ form.consent.title }}</h2>
              <strong>{{ form.consent.organization_name }}</strong>
            </div>
            <div class="consent-copy">
              <p>{{ form.consent.content }}</p>
              <template v-if="form.consent.secondary_use_enabled && form.consent.secondary_use_description">
                <h3>其他教學或研究使用</h3>
                <p>{{ form.consent.secondary_use_description }}</p>
              </template>
              <template v-if="form.consent.withdrawal_method">
                <h3>撤回同意</h3>
                <p>{{ form.consent.withdrawal_method }}</p>
              </template>
              <h3>聯絡方式</h3>
              <p>
                {{ form.consent.contact_name }}<br />
                <a v-if="form.consent.contact_email" :href="`mailto:${form.consent.contact_email}`">{{ form.consent.contact_email }}</a>
                <template v-if="form.consent.contact_phone"><br />{{ form.consent.contact_phone }}</template>
              </p>
            </div>
          </section>

          <section class="consent-card consent-signature">
            <label class="consent-check">
              <input v-model="hasReadConsent" type="checkbox" />
              <span>我已閱讀並了解上述知情同意書內容。</span>
            </label>
            <label class="consent-check consent-check--required">
              <input v-model="participantAgreed" type="checkbox" />
              <span>我自願參與本次問卷，並同意將資料用於上述計畫用途。<b>*</b></span>
            </label>
            <label class="consent-input">
              <span>參與者姓名（電子簽署）<b>*</b></span>
              <input v-model="participantName" autocomplete="name" placeholder="請輸入姓名" />
            </label>

            <fieldset v-if="form.consent.requires_guardian" class="age-choice">
              <legend>參與者是否已滿 18 歲？<b>*</b></legend>
              <label><input v-model="ageStatus" type="radio" value="adult" /> 已滿 18 歲</label>
              <label><input v-model="ageStatus" type="radio" value="minor" /> 未滿 18 歲</label>
            </fieldset>

            <div v-if="form.consent.requires_guardian && ageStatus === 'minor'" class="guardian-fields">
              <div>
                <label class="consent-input">
                  <span>法定代理人姓名<b>*</b></span>
                  <input v-model="guardianName" autocomplete="name" />
                </label>
                <label class="consent-input">
                  <span>與參與者關係<b>*</b></span>
                  <input v-model="guardianRelationship" placeholder="例如：父親、母親" />
                </label>
              </div>
              <label class="consent-check consent-check--required">
                <input v-model="guardianAgreed" type="checkbox" />
                <span>本人為參與者之法定代理人，已閱讀並同意其參與本次問卷。<b>*</b></span>
              </label>
            </div>

            <label v-if="form.consent.secondary_use_enabled" class="consent-check consent-check--optional">
              <input v-model="secondaryUseAgreed" type="checkbox" />
              <span>我另外同意資料經去識別化後，供其他經審核的教學或研究使用。<small>此項為選填，不影響是否能參與問卷。</small></span>
            </label>
          </section>

          <p v-if="error" class="submit-error" role="alert">{{ error }}</p>
          <div class="consent-actions">
            <button class="decline-button" type="button" @click="declineConsent">不同意並離開</button>
            <button class="submit-button" type="submit">同意並繼續</button>
          </div>
        </form>

        <form v-else-if="!emailVerified" class="email-step" @submit.prevent="verifyEmail">
          <section class="basic-section-heading">
            <p class="eyebrow">基本資料</p>
            <h2>{{ respondentPage?.title || '基本資料' }}</h2>
            <p>{{ respondentPage?.content || '請先填寫基本資料。' }}</p>
          </section>
          <section class="answer-card respondent-card">
            <h2>電子郵件 <b>*</b></h2>
            <label class="sr-only" for="respondent-email">電子郵件</label>
            <input
              id="respondent-email"
              v-model="email"
              type="email"
              autocomplete="email"
              placeholder="請輸入電子郵件"
              required
            />
          </section>

          <template v-for="question in basicQuestions" :key="question.question_id">
            <section v-if="question.question_type === 'DS'" class="description-card">
              <h3>{{ question.title || question.content }}</h3>
              <p v-if="question.title && question.content">{{ question.content }}</p>
            </section>
            <section v-else class="answer-card">
              <h2>{{ question.title }} <b v-if="question.is_required">*</b></h2>
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
                  <input v-model.number="answers[question.question_id]" type="radio" :name="question.question_id" :value="score + (question.scale_begin ?? 1) - 1" :required="question.is_required" />
                </label>
              </div>
              <DateInput
                v-else-if="question.question_type === 'DT'"
                :model-value="String(answers[question.question_id] ?? '')"
                :required="question.is_required"
                @update:model-value="answers[question.question_id] = $event"
              />
              <div v-else class="choice-answer">
                <label v-for="option in question.options" :key="option.option_id">
                  <input v-model="answers[question.question_id]" :type="question.is_multiple ? 'checkbox' : 'radio'" :name="question.question_id" :value="option.option_id" :required="question.is_required && !question.is_multiple" />
                  {{ option.label }}
                </label>
                <small v-if="question.is_multiple">可複選</small>
              </div>
            </section>
          </template>
          <p v-if="error" class="submit-error" role="alert">{{ error }}</p>
          <button class="submit-button" type="submit" :disabled="checkingEmail">
            {{ checkingEmail ? "檢查中…" : "確認基本資料並開始填寫" }}
          </button>
        </form>

        <form v-else @submit.prevent="submitOrContinue">
          <section class="email-confirmed">
            <span>填答電子郵件：{{ email }}</span>
            <button type="button" @click="changeEmail">更換</button>
          </section>

          <section v-if="isBlockByBlock && currentOutcomePage" class="outcome-section-heading">
            <p class="eyebrow">區塊 {{ currentOutcomePageIndex + 1 }} / {{ outcomePages.length }}</p>
            <h2>{{ currentOutcomePage.title || `成果區塊 ${currentOutcomePageIndex + 1}` }}</h2>
            <p v-if="currentOutcomePage.content">{{ currentOutcomePage.content }}</p>
          </section>

          <template v-for="(question, index) in questions" :key="question.question_id">
            <section v-if="question.question_type === 'DS'" class="description-card">
              <h3>{{ question.title || question.content }}</h3>
              <p v-if="question.title && question.content">{{ question.content }}</p>
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

              <DateInput
                v-else-if="question.question_type === 'DT'"
                :model-value="String(answers[question.question_id] ?? '')"
                :required="question.is_required"
                @update:model-value="answers[question.question_id] = $event"
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
          <div class="form-actions">
            <button
              v-if="isBlockByBlock && currentOutcomePageIndex > 0"
              class="previous-button"
              type="button"
              :disabled="submitting"
              @click="goToPreviousBlock"
            >上一頁</button>
            <button class="submit-button" type="submit" :disabled="submitting">
              {{ submitting
                ? "送出中…"
                : isBlockByBlock && currentOutcomePageIndex < outcomePages.length - 1
                  ? "下一頁"
                  : "送出表單" }}
            </button>
          </div>
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
.eyebrow { margin: 7px 0 12px !important; color: #765292 !important; font-size: 14px !important; font-weight: 750; letter-spacing: .16em; }
.public-heading h1 { margin: 0 0 12px; font-size: 24px; letter-spacing: -.035em; }
.public-heading p { margin: 0; color: #6f6873; font-size: 14px; line-height: 1.7; }
.public-heading small { display: block; margin-top: 22px; color: #99929c; font-size: 14px; }
.public-heading b, .answer-card h2 b { color: #b1485c; }
.basic-section-heading, .outcome-section-heading { padding: 23px 28px; border: 1px solid #d8cbe0; border-left: 5px solid #765292; border-radius: 12px; background: #faf7fc; }
.basic-section-heading h2, .outcome-section-heading h2 { margin: 0 0 7px; color: #4b3d54; font-size: 18px; }
.basic-section-heading p:last-child, .outcome-section-heading p:last-child { margin: 0; color: #756b79; font-size: 14px; line-height: 1.6; }
form { display: grid; gap: 14px; }
.consent-card { overflow: hidden; border: 1px solid #e3dce8; border-radius: 12px; background: #fff; box-shadow: 0 3px 14px rgba(50, 35, 60, .05); }
.consent-card__heading { padding: 29px 32px 23px; border-bottom: 1px solid #eee8f1; background: #fcfafc; }
.consent-card__heading h2 { margin: 0 0 9px; color: #3c3341; font-size: 22px; line-height: 1.45; }
.consent-card__heading strong { color: #6e6373; font-size: 16px; font-weight: 600; }
.consent-copy { padding: 27px 32px 30px; color: #554d59; font-size: 16px; line-height: 1.85; }
.consent-copy h3 { margin: 28px 0 7px; color: #3e3742; font-size: 16px; }
.consent-copy p { margin: 0; white-space: pre-wrap; }
.consent-copy a { color: #684486; }
.consent-signature { display: grid; gap: 18px; padding: 28px 32px; }
.consent-check { display: grid; grid-template-columns: 20px 1fr; align-items: start; gap: 11px; color: #504852; font-size: 16px; line-height: 1.65; }
.consent-check input, .age-choice input { width: 17px; height: 17px; margin: 4px 0 0; accent-color: #765292; }
.consent-check b, .consent-input b, .age-choice b { color: #b1485c; }
.consent-check--optional { padding: 16px; border: 1px solid #ddd2e3; border-radius: 9px; background: #faf7fc; }
.consent-check small { display: block; margin-top: 4px; color: #7f7583; font-size: 14px; }
.consent-input { display: grid; gap: 8px; color: #504852; font-size: 15px; font-weight: 650; }
.consent-input input { box-sizing: border-box; width: 100%; border: 1px solid #d9d1dd; border-radius: 8px; padding: 11px 12px; outline: 0; color: #413a45; font: inherit; font-weight: 400; }
.consent-input input:focus { border-color: #765292; box-shadow: 0 0 0 3px rgba(118, 82, 146, .1); }
.age-choice { display: flex; flex-wrap: wrap; gap: 12px 24px; margin: 0; border: 0; padding: 0; }
.age-choice legend { width: 100%; margin-bottom: 5px; color: #504852; font-size: 15px; font-weight: 650; }
.age-choice label { display: flex; align-items: center; gap: 8px; color: #5f5663; font-size: 16px; }
.guardian-fields { display: grid; gap: 18px; padding: 20px; border: 1px solid #dccde4; border-radius: 10px; background: #fbf8fc; }
.guardian-fields > div { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.consent-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
.decline-button { min-height: 44px; padding: 0 20px; border: 1px solid #d3cad7; border-radius: 8px; background: #fff; color: #655d69; font-weight: 650; }
.answer-card h2 { margin: 0 0 24px; font-size: 14px; font-weight: 650; line-height: 1.6; }
.answer-card textarea, .answer-card > input, .answer-card > .date-input { width: 100%; padding: 10px 2px; resize: vertical; border: 0; border-bottom: 1px solid #bcb5c0; border-radius: 0; outline: 0; color: inherit; }
.answer-card textarea:focus, .answer-card > input:focus, .answer-card > .date-input:focus-within { border-color: #765292; border-bottom-width: 2px; }
.description-card { padding: 28px 32px; color: #4e4752; font-size: 14px; line-height: 1.8; }
.description-card h3 { margin: 0; color: #38323c; font-size: 16px; font-weight: 650; line-height: 1.6; }
.description-card p { margin: 26px 0 0; white-space: pre-wrap; }
.scale-answer { display: flex; justify-content: center; gap: clamp(18px, 6vw, 48px); }
.scale-answer label { display: grid; justify-items: center; gap: 10px; color: #716a75; font-size: 14px; }
.scale-answer input, .choice-answer input { accent-color: #765292; }
.choice-answer { display: grid; gap: 17px; }
.choice-answer label { display: flex; align-items: center; gap: 10px; color: #5f5863; font-size: 14px; }
.respondent-card { display: grid; gap: 8px; }
.respondent-card label { font-size: 14px; font-weight: 650; }
.step-label { margin: 0 0 6px; color: #765292; font-size: 14px; font-weight: 700; }
.email-hint { margin: -12px 0 14px; color: #817986; font-size: 14px; line-height: 1.6; }
.email-confirmed { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border: 1px solid #dcd1e2; border-radius: 9px; background: #faf7fc; color: #665d6b; font-size: 14px; }
.email-confirmed button { border: 0; background: transparent; color: #765292; font-weight: 650; }
.choice-answer small { color: #918996; font-size: 14px; }
.submit-button { justify-self: start; min-height: 44px; padding: 0 24px; border: 0; border-radius: 8px; background: #694786; color: #fff; font-weight: 650; }
.submit-button:disabled { cursor: wait; opacity: .55; }
.form-actions { display: flex; align-items: center; gap: 10px; }
.previous-button { min-height: 44px; padding: 0 22px; border: 1px solid #cfc4d5; border-radius: 8px; background: #fff; color: #684884; font-weight: 650; }
.previous-button:disabled { cursor: wait; opacity: .55; }
.submit-error { margin: 0; padding: 13px 16px; border-radius: 8px; background: #fff0f3; color: #943c50; font-size: 14px; }
.state-card { text-align: center; }
.state-card--error { color: #943c50; }
.state-card--success { padding: 60px 30px; }
.state-card--success span { display: inline-grid; width: 48px; height: 48px; place-items: center; border-radius: 50%; background: #e5f1e8; color: #3d7550; font-size: 20px; }
.state-card--success h1 { margin: 20px 0 8px; }
.state-card--success p { margin: 0; color: #79727c; }
.state-card--declined { padding: 60px 30px; }
.state-card--declined h1 { margin: 0 0 10px; }
.state-card--declined p { margin: 0; color: #79727c; line-height: 1.7; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
@media (max-width: 560px) {
  .public-shell { padding-top: 18px; }
  .public-heading, .answer-card, .description-card { padding: 25px 22px; }
  .consent-card__heading, .consent-copy, .consent-signature { padding-right: 22px; padding-left: 22px; }
  .guardian-fields > div { grid-template-columns: 1fr; }
  .consent-actions { align-items: stretch; flex-direction: column-reverse; }
  .consent-actions button { width: 100%; }
}
</style>
