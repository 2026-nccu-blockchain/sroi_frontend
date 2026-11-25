<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { proxyCurrencies, type FinancialProxy } from "../api/financialProxy.api";

const props = defineProps<{
  id: string;
  modelValue: string | null;
  options: FinancialProxy[];
  disabled?: boolean;
}>();
const emit = defineEmits<{ "update:modelValue": [proxyId: string | null] }>();

const root = ref<HTMLElement>();
const trigger = ref<HTMLButtonElement>();
const searchInput = ref<HTMLInputElement>();
const list = ref<HTMLElement>();
const open = ref(false);
const search = ref("");
const activeIndex = ref(-1);
const amountFormat = new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 4 });
const formatProxy = (proxy: FinancialProxy) => `${proxy.name}・${proxy.currency} ${amountFormat.format(Number(proxy.value))}`;
const selected = computed(() => props.options.find((proxy) => proxy.proxy_id === props.modelValue));

const choices = computed(() => {
  const terms = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const matched: Array<{ id: string | null; label: string }> = props.options.filter((proxy) => {
    const text = `${proxy.name} ${proxy.currency} ${proxyCurrencies[proxy.currency]}`.toLocaleLowerCase();
    return terms.every((term) => text.includes(term));
  }).map((proxy) => ({ id: proxy.proxy_id, label: formatProxy(proxy) }));
  if (!terms.length && props.modelValue !== null) {
    matched.push({ id: null, label: "清除選擇" });
  }
  return matched;
});

const listId = computed(() => `${props.id}-choices`);
const optionId = (index: number) => `${listId.value}-${index}`;
const activeOptionId = computed(() => choices.value[activeIndex.value] ? optionId(activeIndex.value) : undefined);

function close(restoreFocus = false) {
  open.value = false;
  if (restoreFocus) trigger.value?.focus();
}

async function show(direction = 1) {
  if (props.disabled || open.value) return;
  search.value = "";
  open.value = true;
  await nextTick();
  if (!open.value) return;
  const selectedIndex = choices.value.findIndex((choice) => choice.id === props.modelValue);
  activeIndex.value = selectedIndex >= 0 ? selectedIndex : direction === -1 ? choices.value.length - 1 : 0;
  searchInput.value?.focus();
  scrollToActive();
}

function scrollToActive() {
  list.value?.children.item(activeIndex.value)?.scrollIntoView({ block: "nearest" });
}

function select(id: string | null) {
  if (props.disabled) return;
  if (id !== props.modelValue) emit("update:modelValue", id);
  close(true);
}

function onSearchKey(event: KeyboardEvent) {
  if (event.isComposing || event.keyCode === 229) return;
  switch (event.key) {
    case "Escape":
      event.preventDefault();
      event.stopPropagation();
      close(true);
      break;
    case "ArrowDown":
    case "ArrowUp":
      event.preventDefault();
      if (!choices.value.length) return;
      activeIndex.value = Math.max(0, Math.min(choices.value.length - 1,
        activeIndex.value + (event.key === "ArrowDown" ? 1 : -1)));
      scrollToActive();
      break;
    case "Enter": {
      event.preventDefault();
      const choice = choices.value[activeIndex.value];
      if (choice) select(choice.id);
      break;
    }
  }
}

function onFocusOut(event: FocusEvent) {
  if (open.value && !root.value?.contains(event.relatedTarget as Node | null)) close();
}

watch(search, () => {
  activeIndex.value = choices.value.length ? 0 : -1;
  if (list.value) list.value.scrollTop = 0;
});
watch(() => props.disabled, (disabled) => { if (disabled) close(); });
watch(open, (visible, _, onCleanup) => {
  if (!visible) return;
  const onPointerDown = (event: PointerEvent) => {
    if (!root.value?.contains(event.target as Node)) close();
  };
  document.addEventListener("pointerdown", onPointerDown);
  onCleanup(() => document.removeEventListener("pointerdown", onPointerDown));
});
</script>

<template>
  <div ref="root" class="proxy-select" @focusout="onFocusOut">
    <button :id="id" ref="trigger" class="proxy-select__trigger" type="button"
      :disabled="disabled" :aria-expanded="open" :aria-controls="open ? `${id}-search-panel` : undefined"
      :aria-labelledby="`${id}-label ${id}-value`"
      @click="open ? close(true) : show()"
      @keydown.down.prevent="show()" @keydown.up.prevent="show(-1)">
      <span :id="`${id}-value`">{{ selected ? formatProxy(selected) : "請選擇財務代理變數" }}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
    <div v-if="open" :id="`${id}-search-panel`" class="proxy-select__panel">
      <div class="proxy-select__search">
        <input ref="searchInput" v-model="search" type="text" role="combobox" aria-label="搜尋財務代理變數"
          autocomplete="off" placeholder="搜尋名稱或幣別" aria-expanded="true" aria-autocomplete="list"
          :aria-controls="listId" :aria-activedescendant="activeOptionId" @keydown="onSearchKey" />
      </div>
      <ul :id="listId" ref="list" class="proxy-select__options" role="listbox" aria-label="財務代理變數選項">
        <li v-for="(choice, index) in choices" :id="optionId(index)" :key="choice.id ?? 'clear'" role="option"
          :aria-selected="modelValue === choice.id" :class="{ active: index === activeIndex }"
          @mousedown.prevent @click="select(choice.id)">
          {{ choice.label }}
        </li>
      </ul>
      <p v-if="!choices.length" class="proxy-select__empty" role="status">
        {{ search.trim() ? "找不到符合的財務代理變數" : "目前沒有可選的財務代理變數" }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.proxy-select { position: relative; min-width: 0; }
.proxy-select__trigger {
  display: flex; width: 100%; min-width: 0; min-height: 40px; align-items: center; justify-content: space-between;
  gap: 10px; border: 0; padding: 9px 10px; background: #fff; color: #111; font: inherit; font-size: 14px;
  text-align: start; cursor: pointer;
}
.proxy-select__trigger span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.proxy-select__trigger svg { flex-shrink: 0; }
.proxy-select__trigger[aria-expanded="true"] svg { transform: rotate(180deg); }
.proxy-select__trigger:focus-visible { outline: 2px solid #111; outline-offset: -3px; }
.proxy-select__trigger:disabled { cursor: default; }
.proxy-select__panel {
  position: absolute; z-index: 5; top: calc(100% + 4px); inset-inline: 0; min-width: min(220px, 74vw);
  border: 1px solid #bbb; border-radius: 6px; background: #fff; box-shadow: 0 8px 24px #0002;
}
.proxy-select__search { padding: 8px; border-bottom: 1px solid #eee; }
.proxy-select__search input {
  width: 100%; box-sizing: border-box; border: 1px solid #aaa; border-radius: 4px;
  padding: 8px 9px; color: #111; background: #fff; font: inherit; font-size: 14px;
}
.proxy-select__search input:focus { outline: 1px solid #555; }
.proxy-select__options { max-height: 230px; overflow: auto; margin: 0; padding: 0; list-style: none; }
.proxy-select__options li { padding: 8px 10px; color: #222; font-size: 14px; overflow-wrap: anywhere; cursor: pointer; }
.proxy-select__options li.active, .proxy-select__options li:hover { background: #eee; }
.proxy-select__options li[aria-selected="true"] { font-weight: 700; }
.proxy-select__empty { margin: 0; padding: 12px; color: #666; font-size: 14px; }
</style>
