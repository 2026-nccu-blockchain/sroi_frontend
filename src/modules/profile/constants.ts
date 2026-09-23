export const ROLE_LABELS: Record<string, string> = {
  admin: "管理員",
  db_editor: "資料庫編輯者",
  verified: "已驗證",
  in_progress: "驗證中",
  unverified: "未驗證"
};

// 這兩種帳號還沒有經過審核的學號
export const UNVERIFIED_ROLES = ["unverified", "in_progress"];
