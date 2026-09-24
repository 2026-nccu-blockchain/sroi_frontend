<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { useAuth } from "@/modules/auth/composables/useAuth";
import { deleteForm, getForms } from "@/modules/forms/api/forms.api";
import type { FormResponse, FormStatus } from "@/modules/forms/types/form.types";

type StatusFilter = "all" | FormStatus;

const router = useRouter();
const { isAuthenticated, user } = useAuth();
const forms = ref<FormResponse[]>([]);
const loading = ref(false);
const error = ref("");
const deletingId = ref("");
const search = ref("");
const statusFilter = ref<StatusFilter>("all");

const statusLabel: Record<FormStatus, string> = {
  draft: "草稿",
  published: "已發布",
  closed: "已關閉"
};

const publishedCount = computed(() => forms.value.filter((form) => form.status === "published").length);
const draftCount = computed(() => forms.value.filter((form) => form.status === "draft").length);
const filteredForms = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  return forms.value.filter((form) => {
    const matchesStatus = statusFilter.value === "all" || form.status === statusFilter.value;
    const matchesKeyword = !keyword
      || (form.title ?? "").toLowerCase().includes(keyword)
      || (form.content ?? "").toLowerCase().includes(keyword);
    return matchesStatus && matchesKeyword;
  });
});

const loadForms = async (): Promise<void> => {
  if (!isAuthenticated.value) return;
  loading.value = true;
  error.value = "";
  try {
    forms.value = await getForms();
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "無法載入表單";
  } finally {
    loading.value = false;
  }
};

const createNewForm = async (): Promise<void> => {
  await router.push({ name: "form-builder-new" });
};

const editForm = async (formId: string): Promise<void> => {
  await router.push({ name: "form-builder-edit", params: { formId } });
};

const openResponses = async (formId: string): Promise<void> => {
  await router.push({ name: "form-responses", params: { formId }, query: { from: "/forms" } });
};

const removeForm = async (form: FormResponse): Promise<void> => {
  if (!window.confirm(`確定要刪除「${form.title ?? "未命名表單"}」嗎？`)) return;
  deletingId.value = form.form_id;
  error.value = "";
  try {
    await deleteForm(form.form_id);
    forms.value = forms.value.filter((item) => item.form_id !== form.form_id);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "刪除表單失敗";
  } finally {
    deletingId.value = "";
  }
};

const questionCount = (form: FormResponse): number =>
  form.pages.reduce((count, page) => count + page.questions.length, 0);

const blockCount = (form: FormResponse): number => form.pages.length;

const formatDate = (value?: string | null): string => {
  if (!value) return "尚未更新";
  return new Intl.DateTimeFormat("zh-TW", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
};

onMounted(() => void loadForms());
</script>

<template>
  <section class="form-dashboard">
    <header class="welcome-card">
      <div class="welcome-card__copy">
        <p class="eyebrow">SROI FORM WORKSPACE</p>
        <h1>我的表單</h1>
        <p v-if="isAuthenticated">整理關鍵精神、設計題目，並在同一個地方查看每份表單的回覆。</p>
        <p v-else>登入後即可建立、發布並管理你的 SROI 評估表單。</p>
        <button v-if="isAuthenticated" class="primary-button" type="button" @click="createNewForm">
          <span>＋</span> 建立新表單
        </button>
        <RouterLink v-else class="primary-button" to="/auth/login">登入開始使用</RouterLink>
      </div>
      <div class="welcome-card__visual" aria-hidden="true">
        <div class="visual-card visual-card--back"><i></i><i></i><i></i></div>
        <div class="visual-card visual-card--front">
          <span></span><b></b><b></b><b></b>
        </div>
      </div>
    </header>

    <template v-if="isAuthenticated">
      <section class="summary-grid" aria-label="表單統計">
        <article>
          <div class="summary-icon summary-icon--all">▤</div>
          <div><strong>{{ forms.length }}</strong><span>全部表單</span></div>
        </article>
        <article>
          <div class="summary-icon summary-icon--published">✓</div>
          <div><strong>{{ publishedCount }}</strong><span>已發布</span></div>
        </article>
        <article>
          <div class="summary-icon summary-icon--draft">✎</div>
          <div><strong>{{ draftCount }}</strong><span>編輯中的草稿</span></div>
        </article>
      </section>

      <section class="library">
        <header class="library__header">
          <div>
            <p class="eyebrow">YOUR LIBRARY</p>
            <h2>所有表單</h2>
          </div>
          <div class="library__tools">
            <label class="search-box">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
              <input v-model="search" type="search" placeholder="搜尋表單" aria-label="搜尋表單" />
            </label>
            <select v-model="statusFilter" aria-label="依狀態篩選">
              <option value="all">全部狀態</option>
              <option value="draft">草稿</option>
              <option value="published">已發布</option>
              <option value="closed">已關閉</option>
            </select>
          </div>
        </header>

        <p v-if="error" class="message message--error" role="alert">{{ error }}</p>
        <div v-if="loading" class="loading-grid" aria-label="表單載入中">
          <span v-for="index in 3" :key="index"></span>
        </div>

        <div v-else-if="forms.length && filteredForms.length" class="form-grid">
          <article v-for="(form, index) in filteredForms" :key="form.form_id" class="form-card">
            <button class="form-card__preview" type="button" @click="editForm(form.form_id)">
              <span class="preview-accent" :class="`preview-accent--${index % 4}`"></span>
              <span class="status" :class="`status--${form.status}`">
                <i></i>{{ statusLabel[form.status] }}
              </span>
              <div class="preview-lines" aria-hidden="true"><i></i><i></i><i></i></div>
            </button>
            <div class="form-card__body">
              <button class="form-title" type="button" @click="editForm(form.form_id)">
                {{ form.title || "未命名表單" }}
              </button>
              <p>{{ form.content || "尚未加入表單說明" }}</p>
              <div class="form-meta">
                <span>{{ blockCount(form) }} 個區塊</span>
                <i></i>
                <span>{{ questionCount(form) }} 題</span>
                <i></i>
                <span>{{ formatDate(form.update_time ?? form.create_time) }}</span>
              </div>
            </div>
            <footer>
              <button type="button" @click="editForm(form.form_id)">編輯</button>
              <button type="button" @click="openResponses(form.form_id)">查看回覆</button>
              <a v-if="form.public_token" :href="`/forms/${form.public_token}`" target="_blank" rel="noopener">開啟表單 ↗</a>
              <button class="danger" type="button" :disabled="deletingId === form.form_id" @click="removeForm(form)">
                {{ deletingId === form.form_id ? "刪除中…" : "刪除" }}
              </button>
            </footer>
          </article>

          <button class="new-form-card" type="button" @click="createNewForm">
            <span>＋</span>
            <strong>建立新表單</strong>
            <small>從空白表單開始設計</small>
          </button>
        </div>

        <section v-else-if="forms.length" class="empty-state">
          <span>⌕</span>
          <h3>找不到符合條件的表單</h3>
          <p>換一個關鍵字或篩選條件試試看。</p>
          <button type="button" @click="search = ''; statusFilter = 'all'">清除篩選</button>
        </section>

        <section v-else class="empty-state">
          <span>＋</span>
          <h3>建立你的第一份表單</h3>
          <p>先建立關鍵精神區塊，再加入量表、選擇題或文字問題。</p>
          <button type="button" @click="createNewForm">建立新表單</button>
        </section>
      </section>
    </template>
  </section>
</template>

<style scoped>
.form-dashboard { display: grid; gap: 28px; color: #312b35; font-family: Inter, "Noto Sans TC", "PingFang TC", system-ui, sans-serif; }
.eyebrow { margin: 0 0 10px; color: #8a699f; font-size: 10px; font-weight: 800; letter-spacing: .15em; }
button, input, select { font: inherit; }
button { cursor: pointer; }
svg { fill: none; stroke: currentColor; stroke-linecap: round; stroke-width: 1.8; }
.welcome-card { position: relative; display: grid; min-height: 270px; grid-template-columns: minmax(0, 1fr) 310px; align-items: center; overflow: hidden; padding: 42px 46px; border: 1px solid #e4dbe9; border-radius: 22px; background: linear-gradient(125deg, #fff 15%, #f7f0fb 60%, #eee1f5); box-shadow: 0 10px 36px rgba(67, 42, 79, .08); }
.welcome-card::before { position: absolute; width: 260px; height: 260px; border: 55px solid rgba(132, 91, 157, .08); border-radius: 50%; content: ""; right: -85px; top: -110px; }
.welcome-card__copy { position: relative; z-index: 2; }
.welcome-card h1 { margin: 0; color: #352a3b; font-size: clamp(38px, 5vw, 58px); letter-spacing: -.055em; line-height: 1; }
.welcome-card__copy > p:not(.eyebrow) { max-width: 540px; margin: 18px 0 26px; color: #746b79; font-size: 13px; line-height: 1.8; }
.primary-button { display: inline-flex; min-height: 44px; align-items: center; gap: 8px; padding: 0 19px; border: 0; border-radius: 10px; background: #6e4a88; box-shadow: 0 7px 18px rgba(91, 57, 116, .22); color: #fff; font-size: 12px; font-weight: 700; text-decoration: none; }
.primary-button:hover { background: #5e3c77; transform: translateY(-1px); }
.primary-button span { font-size: 18px; font-weight: 400; }
.welcome-card__visual { position: relative; height: 190px; }
.visual-card { position: absolute; width: 190px; height: 155px; border-radius: 15px; background: #fff; box-shadow: 0 18px 45px rgba(67, 39, 81, .15); }
.visual-card--back { top: 0; right: 62px; padding: 35px 26px; transform: rotate(-8deg); background: #d7c2e4; }
.visual-card--back i { display: block; width: 75%; height: 7px; margin-bottom: 13px; border-radius: 5px; background: rgba(255,255,255,.68); }
.visual-card--front { right: 6px; bottom: 0; padding: 28px 25px; transform: rotate(5deg); }
.visual-card--front span { display: block; width: 60%; height: 10px; margin-bottom: 25px; border-radius: 5px; background: #82609a; }
.visual-card--front b { display: block; width: 100%; height: 8px; margin-top: 16px; border-radius: 5px; background: #eee8f1; }
.visual-card--front b:nth-of-type(2) { width: 82%; }
.visual-card--front b:nth-of-type(3) { width: 65%; }
.summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.summary-grid article { display: flex; align-items: center; gap: 15px; padding: 20px 22px; border: 1px solid #e7e0ea; border-radius: 14px; background: #fff; box-shadow: 0 3px 14px rgba(58, 39, 67, .035); }
.summary-grid article > div:last-child { display: grid; gap: 2px; }
.summary-grid strong { color: #39313e; font-size: 23px; line-height: 1; }
.summary-grid article span { color: #8b838f; font-size: 11px; }
.summary-icon { display: grid; width: 40px; height: 40px; place-items: center; border-radius: 11px; font-size: 17px; }
.summary-icon--all { background: #eee5f3; color: #765292; }
.summary-icon--published { background: #e6f2e9; color: #47805a; }
.summary-icon--draft { background: #fff1d9; color: #9c6d23; }
.library { display: grid; gap: 20px; padding-top: 10px; }
.library__header { display: flex; align-items: end; justify-content: space-between; gap: 20px; }
.library__header h2 { margin: 0; font-size: 24px; letter-spacing: -.025em; }
.library__tools { display: flex; gap: 9px; }
.search-box { display: flex; width: 220px; height: 40px; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid #ded7e2; border-radius: 9px; background: #fff; color: #918997; }
.search-box svg { width: 17px; }
.search-box input { min-width: 0; flex: 1; border: 0; outline: 0; color: #403944; font-size: 11px; }
.library__tools select { min-width: 120px; border: 1px solid #ded7e2; border-radius: 9px; padding: 0 12px; outline: 0; background: #fff; color: #665e6a; font-size: 11px; }
.message { margin: 0; padding: 14px 16px; border: 1px solid #dccfd4; border-radius: 9px; background: #fff; font-size: 12px; }
.message--error { border-color: #e2b8c1; background: #fff5f7; color: #913b50; }
.loading-grid, .form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(285px, 1fr)); gap: 17px; }
.loading-grid span { height: 330px; border-radius: 14px; background: linear-gradient(100deg, #eeeaf0 20%, #f8f6f9 40%, #eeeaf0 60%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
.form-card { display: grid; overflow: hidden; grid-template-rows: 138px 1fr auto; border: 1px solid #e3dce7; border-radius: 15px; background: #fff; box-shadow: 0 4px 18px rgba(55, 36, 64, .045); transition: transform 160ms ease, box-shadow 160ms ease; }
.form-card:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(55, 36, 64, .09); }
.form-card__preview { position: relative; overflow: hidden; border: 0; border-bottom: 1px solid #eee8f1; background: #f8f4fa; text-align: left; }
.preview-accent { position: absolute; inset: 0 auto 0 0; width: 8px; background: #765292; }
.preview-accent--1 { background: #54869b; }
.preview-accent--2 { background: #a77158; }
.preview-accent--3 { background: #608568; }
.status { position: absolute; top: 17px; right: 17px; display: flex; align-items: center; gap: 6px; padding: 5px 9px; border-radius: 15px; background: #eee9f1; color: #756c79; font-size: 9px; font-weight: 750; }
.status i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.status--published { background: #e4f2e7; color: #417653; }
.status--closed { background: #f5e5e8; color: #945262; }
.preview-lines { position: absolute; right: 26px; bottom: 22px; left: 31px; display: grid; gap: 10px; }
.preview-lines i { width: 75%; height: 7px; border-radius: 5px; background: #e3dae8; }
.preview-lines i:first-child { width: 48%; height: 11px; background: #baa6c5; }
.preview-lines i:last-child { width: 60%; }
.form-card__body { min-height: 132px; padding: 20px 20px 16px; }
.form-title { display: block; overflow: hidden; width: 100%; border: 0; padding: 0; background: transparent; color: #3a333e; font-size: 16px; font-weight: 750; text-align: left; text-overflow: ellipsis; white-space: nowrap; }
.form-card__body > p { display: -webkit-box; min-height: 38px; overflow: hidden; margin: 8px 0 14px; color: #817987; font-size: 11px; line-height: 1.7; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.form-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; color: #9a929d; font-size: 9px; }
.form-meta i { width: 3px; height: 3px; border-radius: 50%; background: #c1bbc4; }
.form-card footer { display: flex; align-items: center; gap: 13px; min-height: 47px; padding: 0 18px; border-top: 1px solid #eeeaf0; }
.form-card footer button, .form-card footer a { border: 0; padding: 2px 0; background: transparent; color: #6d4b84; font-size: 10px; font-weight: 650; text-decoration: none; }
.form-card footer .danger { margin-left: auto; color: #aa5363; }
.form-card footer button:disabled { cursor: wait; opacity: .45; }
.new-form-card { display: grid; min-height: 330px; place-content: center; justify-items: center; gap: 8px; border: 1px dashed #bdaac9; border-radius: 15px; background: rgba(255,255,255,.5); color: #765292; }
.new-form-card:hover { border-color: #765292; background: #faf6fc; }
.new-form-card > span { display: grid; width: 46px; height: 46px; margin-bottom: 7px; place-items: center; border-radius: 50%; background: #ede4f2; font-size: 24px; }
.new-form-card strong { font-size: 13px; }
.new-form-card small { color: #9b8fa2; font-size: 10px; }
.empty-state { display: grid; justify-items: center; padding: 70px 24px; border: 1px dashed #c9bcd0; border-radius: 15px; background: #fdfbfe; text-align: center; }
.empty-state > span { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 50%; background: #eee5f3; color: #765292; font-size: 23px; }
.empty-state h3 { margin: 18px 0 7px; }
.empty-state p { margin: 0 0 20px; color: #8a818e; font-size: 11px; }
.empty-state button { min-height: 38px; padding: 0 16px; border: 0; border-radius: 8px; background: #765292; color: #fff; font-size: 11px; font-weight: 700; }
@keyframes shimmer { to { background-position: -200% 0; } }
@media (max-width: 820px) {
  .welcome-card { grid-template-columns: 1fr; }
  .welcome-card__visual { display: none; }
  .summary-grid { grid-template-columns: 1fr; }
}
@media (max-width: 620px) {
  .welcome-card { min-height: auto; padding: 34px 25px; border-radius: 16px; }
  .library__header { align-items: stretch; flex-direction: column; }
  .library__tools { flex-direction: column; }
  .search-box { width: 100%; }
  .library__tools select { height: 40px; }
  .form-grid { grid-template-columns: 1fr; }
}
</style>
