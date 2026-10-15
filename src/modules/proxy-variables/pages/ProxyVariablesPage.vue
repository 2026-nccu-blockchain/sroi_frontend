
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  getFinancialProxies,
  createFinancialProxy,
  updateFinancialProxy,
  deleteFinancialProxy,
  type FinancialProxy,
} from "../api/financialProxy.api";

const proxies = ref<FinancialProxy[]>([]);
const search = ref("");
const showForm = ref(false);
const editingId = ref<string | null>(null);
const error = ref("");
const loading = ref(false);
const saving = ref(false);
const deletingId = ref<string | null>(null);
const form = ref({ name: "", value: "", note: "" });

const filteredProxies = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  return keyword
    ? proxies.value.filter((item) =>
        item.name.toLowerCase().includes(keyword) ||
        item.note.toLowerCase().includes(keyword),
      )
    : proxies.value;
});

async function loadProxies() {
  loading.value = true;
  error.value = "";
  try {
    proxies.value = await getFinancialProxies();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "資料載入失敗";
  } finally {
    loading.value = false;
  }
}
onMounted(() => { void loadProxies(); });

function openCreate() {
  editingId.value = null;
  form.value = { name: "", value: "", note: "" };
  error.value = "";
  showForm.value = true;
}
function openEdit(item: FinancialProxy) {
  editingId.value = item.proxy_id;
  form.value = { name: item.name, value: String(item.value), note: item.note };
  error.value = "";
  showForm.value = true;
}
function closeForm() {
  if (saving.value) return;
  showForm.value = false;
  error.value = "";
}
async function saveProxy() {
  if (saving.value) return;
  const name = form.value.name.trim();
  const rawValue = form.value.value.trim();
  const value = Number(rawValue);
  if (!name) { error.value = "請輸入財務代理變數名稱"; return; }
  if (!rawValue || !Number.isFinite(value)) {
    error.value = "請輸入有效的數值";
    return;
  }
  saving.value = true;
  error.value = "";
  try {
    const data = { name, value, note: form.value.note.trim() };
    if (editingId.value) {
      await updateFinancialProxy(editingId.value, data);
    } else {
      await createFinancialProxy(data);
    }
    showForm.value = false;
    await loadProxies();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "儲存失敗";
  } finally {
    saving.value = false;
  }
}
async function deleteProxy(item: FinancialProxy) {
  if (deletingId.value || !confirm(`確定要刪除「${item.name}」嗎？`)) return;
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
function formatValue(value: number) {
  return new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 4 }).format(value);
}
</script>

<template>
  <section class="proxy-variables">
    <p class="proxy-variables__eyebrow">共用資料庫</p>
    <h1>財務代理變數</h1>

    <div class="toolbar">
      <p class="description">
        管理 SROI 分析使用的財務代理變數。
      </p>
      <button class="primary-button" @click="openCreate">
        ＋ 新增財務代理變數
      </button>
    </div>

    <div class="search-bar">
      <input
        v-model="search"
        type="search"
        placeholder="搜尋財務代理變數名稱或備註"
      />
      <span>共 {{ filteredProxies.length }} 筆</span>
    </div>

    <p v-if="loading" class="local-hint">正在載入資料...</p>
    <p v-if="error && !showForm" class="error-message" role="alert">{{ error }}</p>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>名稱</th>
            <th>數值</th>
            <th>備註</th>
            <th class="actions-heading">操作</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="item in filteredProxies" :key="item.proxy_id">
            <td class="name-cell">{{ item.name }}</td>
            <td class="value-cell">{{ formatValue(item.value) }}</td>
            <td class="note-cell">{{ item.note || "—" }}</td>
            <td class="actions-cell">
              <button class="text-button" @click="openEdit(item)">
                編輯
              </button>
              <button
                class="text-button danger"
                :disabled="deletingId !== null"
                @click="deleteProxy(item)"
              >
                刪除
              </button>
            </td>
          </tr>

          <tr v-if="!loading && !error && filteredProxies.length === 0">
            <td colspan="4" class="empty-state">
              {{
                search
                  ? "找不到符合條件的財務代理變數"
                  : "目前尚無財務代理變數，點擊右上角新增"
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>


    <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
      <div
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="proxy-modal-title"
      >
        <div class="modal-header">
          <h2 id="proxy-modal-title">
            {{ editingId ? "編輯財務代理變數" : "新增財務代理變數" }}
          </h2>
          <button class="close-button" aria-label="關閉" @click="closeForm">
            ×
          </button>
        </div>

        <form @submit.prevent="saveProxy">
          <label>
            名稱 <span class="required">*</span>
            <input
              v-model="form.name"
              type="text"
              maxlength="255"
              placeholder="請輸入名稱"
              required
            />
          </label>

          <label>
            數值 <span class="required">*</span>
            <input
              v-model="form.value"
              type="number"
              step="0.0001"
              placeholder="請輸入數值"
              required
            />
          </label>

          <label>
            備註
            <textarea
              v-model="form.note"
              rows="4"
              placeholder="請輸入備註（選填）"
            ></textarea>
          </label>

          <p v-if="error" class="error-message">{{ error }}</p>

          <div class="form-actions">
            <button type="button" class="cancel-button" :disabled="saving" @click="closeForm">
              取消
            </button>
            <button type="submit" class="primary-button" :disabled="saving">
              {{ saving ? "儲存中..." : editingId ? "儲存修改" : "新增資料" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.proxy-variables {
  display: grid;
  gap: 12px;
  margin-top: -16px;
}

.proxy-variables__eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.15em;
}

h1 {
  margin: 0;
  font-size: 26px;
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
  font-size: 13px;
}

.primary-button {
  border: 1px solid #222;
  border-radius: 6px;
  padding: 10px 16px;
  background: #222;
  color: white;
  font-size: 13px;
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
  font-size: 13px;
}

.search-bar span {
  color: #777;
  font-size: 12px;
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
  font-size: 13px;
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
  font-size: 12px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.45);
}

.modal {
  width: min(100%, 480px);
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 10px;
  padding: 24px;
  background: #fff;
  color: #222;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
}

.close-button {
  border: none;
  background: transparent;
  font-size: 26px;
  cursor: pointer;
}

form {
  display: grid;
  gap: 18px;
}

form label {
  display: grid;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}

form input,
form textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 10px 12px;
  background: #fff;
  color: #222;
  font: inherit;
  font-weight: 400;
}

form textarea {
  resize: vertical;
}

.required,
.error-message {
  color: #b42318;
}

.error-message {
  margin: 0;
  font-size: 12px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.cancel-button {
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 10px 16px;
  background: white;
  cursor: pointer;
}

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

