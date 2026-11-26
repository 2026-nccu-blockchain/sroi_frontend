
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  getFinancialProxies,
  getFinancialProxyCatalog,
  getPendingFinancialProxies,
  reviewFinancialProxy,
  deleteFinancialProxy,
  proxyReviewLabels,
  type FinancialProxy
} from "../api/financialProxy.api";
import ProxyProposalDialog from "../components/ProxyProposalDialog.vue";
import { useAuth } from "@/modules/auth/composables/useAuth";
import { PROJECT_REVIEWER_ROLES } from "@/modules/auth/constants";
import { useDeleteConfirm } from "@/shared/composables/useDeleteConfirm";
import DeleteConfirmDialog from "@/shared/components/DeleteConfirmDialog.vue";

const { deleteDialog, askDelete, answerDelete } = useDeleteConfirm();
const { user } = useAuth();
const route = useRoute();
const router = useRouter();
const canReview = computed(() => PROJECT_REVIEWER_ROLES.includes(user.value?.role ?? ""));
type ProxyTab = "catalog" | "mine" | "review";
const tab = computed<ProxyTab>(() => {
  if (route.query.tab === "mine") return "mine";
  if (route.query.tab === "review" && canReview.value) return "review";
  return "catalog";
});
const loaders = {
  catalog: getFinancialProxyCatalog,
  mine: getFinancialProxies,
  review: getPendingFinancialProxies
};
const tabDescriptions: Record<ProxyTab, string> = {
  catalog: "已通過審核的財務代理變數，登入後即可查閱及用於 SROI。",
  mine: "查看已送出的申請和審核進度。",
  review: "審核使用者送出的財務代理變數。"
};
const emptyMessages: Record<ProxyTab, string> = {
  catalog: "目前沒有已通過的財務代理變數",
  mine: "目前尚無財務代理變數申請",
  review: "目前沒有待審核的申請"
};

const proxies = ref<FinancialProxy[]>([]);
const search = ref("");
const showProposal = ref(false);
const proposal = ref<FinancialProxy>();
const error = ref("");
const loading = ref(false);
const deletingId = ref<string | null>(null);
const reviewingId = ref<string | null>(null);
const reviewMessage = ref("");
let requestId = 0;

const filteredProxies = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  return keyword
    ? proxies.value.filter((item) =>
        item.name.toLowerCase().includes(keyword) ||
        item.note.toLowerCase().includes(keyword) ||
        item.currency.toLowerCase().includes(keyword),
      )
    : proxies.value;
});

async function loadProxies() {
  const id = ++requestId;
  loading.value = true;
  error.value = "";
  try {
    const next = await loaders[tab.value]();
    if (id === requestId) proxies.value = next;
  } catch (err) {
    if (id === requestId) error.value = err instanceof Error ? err.message : "資料載入失敗";
  } finally {
    if (id === requestId) loading.value = false;
  }
}
watch(tab, () => {
  proxies.value = [];
  search.value = "";
  reviewMessage.value = "";
  void loadProxies();
}, { immediate: true });

function changeTab(next: ProxyTab) {
  if (tab.value === next) return;
  void router.push({ name: "proxy-variables", query: next === "catalog" ? {} : { tab: next } });
}

function openProposal(item?: FinancialProxy) {
  proposal.value = item;
  showProposal.value = true;
}

async function decide(item: FinancialProxy, approved: boolean) {
  if (reviewingId.value !== null) return;
  reviewingId.value = item.proxy_id;
  reviewMessage.value = "";
  error.value = "";
  try {
    await reviewFinancialProxy(item.proxy_id, approved);
    if (tab.value === "review") {
      proxies.value = proxies.value.filter((row) => row.proxy_id !== item.proxy_id);
      reviewMessage.value = `「${item.name}」${approved ? "已通過審核" : "已退回"}。`;
    }
  } catch (err) {
    await loadProxies();
    error.value = err instanceof Error ? err.message : "審核失敗";
  } finally {
    reviewingId.value = null;
  }
}
async function deleteProxy(item: FinancialProxy) {
  if (deletingId.value) return;
  const action = item.review_status === "pending" ? "撤回" : "刪除";
  const confirmed = await askDelete({
    title: `${action}財務代理變數`,
    message: `確定要${action}「${item.name}」嗎？此動作無法復原。`
  });
  if (!confirmed) return;
  deletingId.value = item.proxy_id;
  error.value = "";
  try {
    await deleteFinancialProxy(item.proxy_id);
    await loadProxies();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "刪除失敗";
  } finally {
    deletingId.value = null;
  }
}
function formatValue(value: string) {
  return new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 4 }).format(Number(value));
}
</script>

<template>
  <section class="proxy-variables">
    <h1>財務代理變數</h1>

    <div class="toolbar">
      <p class="description">{{ tabDescriptions[tab] }}</p>
      <div class="toolbar-actions">
        <button type="button" class="secondary-button" :disabled="loading || reviewingId !== null" @click="loadProxies">重新整理</button>
        <button v-if="tab !== 'review'" type="button" class="primary-button" @click="openProposal()">＋ 新增財務代理變數</button>
      </div>
    </div>

    <nav class="review-tabs" aria-label="財務代理變數清單">
      <button type="button" :aria-pressed="tab === 'catalog'" @click="changeTab('catalog')">共用資料庫</button>
      <button type="button" :aria-pressed="tab === 'mine'" @click="changeTab('mine')">我的申請</button>
      <button v-if="canReview" type="button" :aria-pressed="tab === 'review'" @click="changeTab('review')">待審核</button>
    </nav>

    <div class="search-bar">
      <input
        v-model="search"
        type="search"
        placeholder="搜尋名稱、幣別或備註"
      />
      <span>共 {{ filteredProxies.length }} 筆</span>
    </div>

    <p v-if="loading" class="local-hint">正在載入資料...</p>
    <p v-if="reviewMessage" class="local-hint" role="status">{{ reviewMessage }}</p>
    <p v-if="error" class="error-message" role="alert">{{ error }}</p>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>名稱</th>
            <th>原幣金額</th>
            <th>備註</th>
            <th v-if="tab !== 'catalog'">狀態</th>
            <th v-if="tab !== 'catalog'" class="actions-heading">操作</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="item in filteredProxies" :key="item.proxy_id">
            <td class="name-cell">{{ item.name }}</td>
            <td class="value-cell">{{ item.currency }} {{ formatValue(item.value) }}</td>
            <td class="note-cell">{{ item.note || "—" }}</td>
            <td v-if="tab !== 'catalog'"><span class="review-status" :data-status="item.review_status">{{ proxyReviewLabels[item.review_status] }}</span></td>
            <td v-if="tab !== 'catalog'" class="actions-cell">
              <template v-if="tab === 'review'">
                <button type="button" class="text-button" :disabled="reviewingId !== null" @click="decide(item, true)">通過</button>
                <button type="button" class="text-button danger" :disabled="reviewingId !== null" @click="decide(item, false)">退回</button>
              </template>
              <template v-else>
                <button v-if="item.review_status === 'rejected'" type="button" class="text-button" @click="openProposal(item)">修改並送審</button>
                <button type="button" class="text-button danger" :disabled="deletingId !== null" @click="deleteProxy(item)">
                  {{ item.review_status === "pending" ? "撤回" : "刪除" }}
                </button>
              </template>
            </td>
          </tr>

          <tr v-if="!loading && !error && filteredProxies.length === 0">
            <td :colspan="tab === 'catalog' ? 3 : 5" class="empty-state">
              {{ search ? "找不到符合條件的財務代理變數" : emptyMessages[tab] }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>


    <ProxyProposalDialog
      v-if="showProposal"
      :proposal="proposal"
      @close="showProposal = false"
      @submitted="loadProxies"
    />
    <DeleteConfirmDialog v-bind="deleteDialog" @confirm="answerDelete(true)" @cancel="answerDelete(false)" />
  </section>
</template>

<style scoped>
.proxy-variables {
  display: grid;
  gap: 12px;
}

h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.04em;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 12px;
}

.description {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.primary-button {
  border: 1px solid #222;
  border-radius: 6px;
  padding: 10px 16px;
  background: #222;
  color: white;
  font-size: 14px;
  cursor: pointer;
}

.primary-button:hover {
  background: #444;
}

.search-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
}

.search-bar input {
  width: min(100%, 360px);
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 10px 12px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 14px;
}

.search-bar span {
  color: #777;
  font-size: 14px;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
  border-top: 1px solid #aaa;
  border-bottom: 1px solid #aaa;
}

table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

th,
td {
  padding: 14px 12px;
  border-bottom: 1px solid #eee;
  font-size: 14px;
  vertical-align: middle;
}

th {
  color: #666;
  font-weight: 600;
}

tbody tr:last-child td {
  border-bottom: none;
}

.name-cell {
  font-weight: 600;
}

.value-cell {
  font-variant-numeric: tabular-nums;
}

.note-cell {
  color: #666;
}

.actions-heading,
.actions-cell {
  text-align: right;
  white-space: nowrap;
}

.text-button {
  border: none;
  padding: 5px 8px;
  background: transparent;
  color: #333;
  cursor: pointer;
}

.text-button:hover {
  text-decoration: underline;
}

.danger {
  color: #b42318;
}

.empty-state {
  padding: 48px 12px;
  color: #888;
  text-align: center;
}

.local-hint {
  margin: 0;
  color: #888;
  font-size: 14px;
}

.error-message { margin: 0; color: #b42318; font-size: 14px; }
.toolbar-actions, .review-tabs { display: flex; flex-wrap: wrap; gap: 8px; }
.secondary-button, .review-tabs button {
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 8px 12px;
  background: #fff;
  color: #222;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}
.review-tabs button[aria-pressed="true"] { border-color: #222; background: #eee; font-weight: 700; }
.review-status {
  display: inline-block;
  white-space: nowrap;
  border-radius: 6px;
  padding: 4px 8px;
  background: #f5efe0;
  color: #594411;
}
.review-status[data-status="approved"] { background: #e8f3eb; color: #245333; }
.review-status[data-status="rejected"] { background: #f7e9e9; color: #882e2e; }

@media (max-width: 600px) {
  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .primary-button {
    width: 100%;
  }

  .form-actions .primary-button {
    width: auto;
  }
}
</style>

