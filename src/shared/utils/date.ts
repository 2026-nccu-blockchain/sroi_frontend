export const formatDate = (value: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);
};

const TAIPEI_TIME_ZONE = "Asia/Taipei";

// ISO 時間字串 -> "YYYY-MM"（以台灣時間判斷月份）
export const toMonthValue = (value: string): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TAIPEI_TIME_ZONE,
    year: "numeric",
    month: "2-digit"
  }).formatToParts(new Date(value));
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  return `${year}-${month}`;
};

// "YYYY-MM" -> 該月第一天 00:00:00（台灣時間）
export const monthStartIso = (month: string): string => `${month}-01T00:00:00+08:00`;

// "YYYY-MM" -> 該月最後一天 23:59:59（台灣時間）
export const monthEndIso = (month: string): string => {
  const [year, monthIndex] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  return `${month}-${String(lastDay).padStart(2, "0")}T23:59:59+08:00`;
};

// 專案期間顯示用，例如 "2026/01 – 2026/12"
export const formatProjectPeriod = (begin: string, end: string): string => {
  const format = (value: string) => toMonthValue(value).replace("-", "/");
  return `${format(begin)} – ${format(end)}`;
};
