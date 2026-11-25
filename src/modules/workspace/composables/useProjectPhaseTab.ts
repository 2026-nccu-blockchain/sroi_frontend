import { computed, type WritableComputedRef } from "vue";
import { useRoute, useRouter, type LocationQuery } from "vue-router";

import { PROJECT_PHASE_TABS } from "@/modules/workspace/constants";
import type { ProjectPhaseTab } from "@/modules/workspace/types/workspace.types";

export const isProjectPhaseTab = (value: unknown): value is ProjectPhaseTab =>
  typeof value === "string" && (PROJECT_PHASE_TABS as string[]).includes(value);

// 從列表進入專案時帶的來源參數；在專案頁、SROI 頁之間來回都要保留，返回時才回得去
const RETURN_FROMS = ["database", "review", "admin", "admin-group"];

export const projectReturnQuery = (query: LocationQuery): Record<string, string> => {
  const keep = (key: string): Record<string, string> => {
    const value = query[key];
    return typeof value === "string" && value ? { [key]: value } : {};
  };
  return {
    ...(isProjectPhaseTab(query.phase) ? { phase: query.phase } : {}),
    ...(typeof query.from === "string" && RETURN_FROMS.includes(query.from) ? { from: query.from } : {}),
    // 管理員所有專案的個人／群組分頁、搜尋字、頁碼
    ...(query.from === "admin" ? { ...keep("scope"), ...keep("q"), ...keep("page") } : {})
  };
};

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
