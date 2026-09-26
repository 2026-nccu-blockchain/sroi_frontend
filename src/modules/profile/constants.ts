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

// 與後端 upload.py 的 ALLOWED_FILE_TYPES、MAX_FILE_SIZE 一致
// HEIC / HEIF 在很多瀏覽器的 file.type 是空的，所以用副檔名判斷；真正的格式由後端檢查檔案內容
export const ID_CARD_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".pdf"];
export const ID_CARD_ACCEPT = [...ID_CARD_EXTENSIONS, "image/heic", "image/heif", "application/pdf"].join(",");
export const ID_CARD_MAX_SIZE = 2 * 1024 * 1024;
export const ID_CARD_MAX_SIZE_LABEL = "2MB";
export const ID_CARD_FORMAT_LABEL = "JPG、PNG、WebP、HEIC、HEIF、PDF";

export const isAllowedIdCardFile = (file: File): boolean =>
  ID_CARD_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
