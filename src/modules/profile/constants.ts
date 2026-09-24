export const ROLE_LABELS: Record<string, string> = {
  admin: "管理員",
  db_editor: "資料庫編輯者",
  verified: "已驗證",
  in_progress: "驗證中",
  unverified: "未驗證"
};

// 這兩種帳號還沒有經過審核的學號
export const UNVERIFIED_ROLES = ["unverified", "in_progress"];

// 只有未驗證帳號能送驗證申請，驗證中的後端會擋
export const VERIFY_ROLES = ["unverified"];

// 與後端 is_strong_password 規則一致
export const isStrongPassword = (password: string): boolean =>
  password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);

export const PASSWORD_RULE_HINT = "至少 8 碼，需包含大寫、小寫英文與數字";

export const ID_CARD_ACCEPT = ["image/jpeg", "image/png", "image/webp"];
export const ID_CARD_MAX_SIZE = 5 * 1024 * 1024;
