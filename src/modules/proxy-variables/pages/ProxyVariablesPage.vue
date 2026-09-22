<script setup lang="ts"></script>

<template>
  <section class="proxy-variables">
    <p class="proxy-variables__eyebrow">共用資料庫</p>
    <h1>財務代理變數</h1>
    <p class="proxy-variables__notice">此頁面尚在建置中，之後會顯示可共用的財務代理變數清單。</p>
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

.proxy-variables__notice {
  margin: 8px 0 0;
  padding: 13px 0;
  border-top: 1px solid #aaa;
  border-bottom: 1px solid #aaa;
  color: #555;
  font-size: 13px;
}
</style>
