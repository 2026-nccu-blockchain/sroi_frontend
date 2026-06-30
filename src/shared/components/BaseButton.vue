<script setup lang="ts">
defineProps<{
  type?: "button" | "submit" | "reset";
}>();
</script>

<template>
  <button :type="type ?? 'button'" class="base-button">
    <slot />
  </button>
</template>

<style scoped>
.base-button {
  border: none;
  border-radius: 6px;
  background: #2563eb;
  color: #ffffff;
  padding: 10px 14px;
  cursor: pointer;
}
</style>
