export const ROLE_LABELS: Record<string, string> = {
  admin: "管理員",
  db_editor: "資料庫編輯者",
  normal: "一般使用者"
};

// 與後端 is_strong_password 規則一致
export const isStrongPassword = (password: string): boolean =>
  password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);

export const PASSWORD_RULE_HINT = "至少 8 碼，需包含大寫、小寫英文與數字";

