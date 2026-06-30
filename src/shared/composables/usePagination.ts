import { computed, ref, type ComputedRef, type Ref } from "vue";

interface UsePaginationResult {
  page: Ref<number>;
  pageSize: Ref<number>;
  offset: ComputedRef<number>;
  setPage: (value: number) => void;
}

export const usePagination = (initialPageSize = 10): UsePaginationResult => {
  const page = ref(1);
  const pageSize = ref(initialPageSize);
  const offset = computed(() => (page.value - 1) * pageSize.value);

  const setPage = (value: number): void => {
    page.value = Math.max(1, value);
  };

  return {
    page,
    pageSize,
    offset,
    setPage
  };
};
