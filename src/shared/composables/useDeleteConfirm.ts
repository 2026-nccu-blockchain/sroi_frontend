import { reactive } from "vue";

export interface DeleteConfirmOptions {
  title: string;
  message: string;
  details?: string[];
  confirmText?: string;
}

// 用法：if (!(await askDelete({ ... }))) return;
// 頁面上放一個 <DeleteConfirmDialog v-bind="deleteDialog" @confirm="answerDelete(true)" @cancel="answerDelete(false)" />
export const useDeleteConfirm = () => {
  const deleteDialog = reactive({
    open: false,
    title: "",
    message: "",
    details: [] as string[],
    confirmText: "刪除"
  });
  let resolver: ((confirmed: boolean) => void) | null = null;

  // 回傳使用者是否按了「刪除」
  const askDelete = (options: DeleteConfirmOptions): Promise<boolean> => {
    resolver?.(false);
    Object.assign(deleteDialog, { details: [], confirmText: "刪除", ...options, open: true });
    return new Promise((resolve) => { resolver = resolve; });
  };

  const answerDelete = (confirmed: boolean): void => {
    deleteDialog.open = false;
    const resolve = resolver;
    resolver = null;
    resolve?.(confirmed);
  };

  return { deleteDialog, askDelete, answerDelete };
};
