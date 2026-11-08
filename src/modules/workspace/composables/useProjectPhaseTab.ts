import { computed, type WritableComputedRef } from "vue";
import { useRoute, useRouter } from "vue-router";

import { PROJECT_PHASE_TABS } from "@/modules/workspace/constants";
import type { ProjectPhaseTab } from "@/modules/workspace/types/workspace.types";

export const isProjectPhaseTab = (value: unknown): value is ProjectPhaseTab =>
  typeof value === "string" && (PROJECT_PHASE_TABS as string[]).includes(value);

// 分頁存在網址的 ?phase=，從專案頁返回時會回到原本的分頁
export const useProjectPhaseTab = (): WritableComputedRef<ProjectPhaseTab> => {
  const route = useRoute();
  const router = useRouter();

  return computed({
    get: () => (isProjectPhaseTab(route.query.phase) ? route.query.phase : "all"),
    set: (phase) => {
      const { phase: _removed, ...rest } = route.query;
      void router.replace({ query: phase === "all" ? rest : { ...rest, phase } });
    }
  });
};
