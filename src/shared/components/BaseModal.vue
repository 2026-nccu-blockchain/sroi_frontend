<script setup lang="ts">
defineProps<{
  open: boolean;
}>();
</script>

<template>
  <div v-if="open" class="base-modal">
    <div class="base-modal__content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.base-modal {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(17, 24, 39, 0.4);
}

.base-modal__content {
  min-width: 300px;
  padding: 20px;
  background: #ffffff;
  border-radius: 10px;
}
</style>
