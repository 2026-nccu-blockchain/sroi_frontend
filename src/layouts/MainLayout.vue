<template>
  <div class="layout">
    <header class="layout__header">Main Layout</header>
    <main class="layout__content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.layout__header {
  padding: 16px;
  background: #111827;
  color: #ffffff;
}

.layout__content {
  flex: 1;
  padding: 24px;
}
</style>
