// 後端只存 email @ 前面的部分，網域固定是政大信箱
export const EMAIL_DOMAIN = "@nccu.edu.tw";

const EMAIL_PREFIX_PATTERN = /^[A-Za-z0-9._%+-]+$/;

// 顯示用：補上網域；舊資料可能已經是完整 email 就不再補
export const toFullEmail = (email?: string): string => {
  if (!email) return "";
  return email.includes("@") ? email : email + EMAIL_DOMAIN;
};

// 使用者可能貼上完整的政大信箱，先去掉網域；格式不合回傳 null
export const normalizeEmailPrefix = (value: string): string | null => {
  let prefix = value.trim().toLowerCase();
  if (prefix.endsWith(EMAIL_DOMAIN)) prefix = prefix.slice(0, -EMAIL_DOMAIN.length);
  return EMAIL_PREFIX_PATTERN.test(prefix) ? prefix : null;
};
