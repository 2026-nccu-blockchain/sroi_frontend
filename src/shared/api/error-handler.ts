export class ApiError extends Error {
  statusCode?: string;

  constructor(message: string, statusCode?: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

export const hasChinese = (text: string): boolean => /[一-鿿]/.test(text);

// 畫面只顯示中文；程式內部丟出的英文錯誤（例如 TypeError）改成通用訊息
export const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && hasChinese(error.message)) {
    return error.message;
  }

  return "發生未預期的錯誤，請稍後再試";
};
