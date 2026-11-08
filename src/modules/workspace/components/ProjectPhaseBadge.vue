<script setup lang="ts">
import { PROJECT_PHASE_LABELS } from "@/modules/workspace/constants";
import type { ProjectPhase } from "@/modules/workspace/types/workspace.types";

defineProps<{ phase: ProjectPhase }>();
</script>

<template>
  <small :class="['phase-badge', `phase-badge--${phase}`]">{{ PROJECT_PHASE_LABELS[phase] }}</small>
</template>

<style scoped>
.phase-badge { display: inline-flex; padding: 4px 10px; border-radius: 999px; font-size: 14px; font-weight: 700; letter-spacing: normal; white-space: nowrap; }
.phase-badge--not_started { background: #f0f0f0; color: #555; }
.phase-badge--in_progress { background: #e5f3e8; color: #2f7140; }
.phase-badge--pending_close { background: #fdf0dc; color: #8a5a12; }
.phase-badge--closed { background: #f0e8f4; color: #765292; }
</style>
