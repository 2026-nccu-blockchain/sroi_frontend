// 系統統一以台灣時間判斷日期，不受使用者電腦時區影響
// 後端欄位都是 timestamptz，回傳的 ISO 字串帶時區；送出時也一律帶 +08:00
export const TAIPEI_TIME_ZONE = "Asia/Taipei";
const TAIPEI_OFFSET = "+08:00";

const pad = (value: number): string => String(value).padStart(2, "0");

// 時間（ISO 字串或 Date）-> "YYYY-MM-DD"（台灣時間）
export const toDateValue = (value: string | Date): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TAIPEI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(typeof value === "string" ? new Date(value) : value);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};

// ISO 時間字串 -> "YYYY-MM"（以台灣時間判斷月份）
export const toMonthValue = (value: string | Date): string => toDateValue(value).slice(0, 7);

// 台灣時間的今年
export const currentTaipeiYear = (): number => Number(toDateValue(new Date()).slice(0, 4));

// "YYYY-MM-DD" -> 當天 00:00:00（台灣時間）
export const dayStartIso = (date: string): string => `${date}T00:00:00${TAIPEI_OFFSET}`;

// "YYYY-MM-DD" -> 當天 23:59:59（台灣時間），讓結束日當天也算在期間內
export const dayEndIso = (date: string): string => `${date}T23:59:59${TAIPEI_OFFSET}`;

// "YYYY-MM" -> 該月第一天 00:00:00（台灣時間）
export const monthStartIso = (month: string): string => dayStartIso(`${month}-01`);

// "YYYY-MM" -> 該月最後一天 23:59:59（台灣時間）
export const monthEndIso = (month: string): string => {
  const [year, monthIndex] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  return dayEndIso(`${month}-${pad(lastDay)}`);
};

// 顯示用 "MM/DD/YYYY"（台灣時間）
export const formatDate = (value: string | Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TAIPEI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(typeof value === "string" ? new Date(value) : value);
};

// 顯示用 "2026/1/31"（台灣時間）
export const formatTaipeiDate = (value: string | Date): string => {
  return new Intl.DateTimeFormat("zh-TW", { timeZone: TAIPEI_TIME_ZONE }).format(
    typeof value === "string" ? new Date(value) : value
  );
};

// 專案期間顯示用，例如 "2026/01 – 2026/12"
export const formatProjectPeriod = (begin: string, end: string): string => {
  const format = (value: string) => toMonthValue(value).replace("-", "/");
  return `${format(begin)} – ${format(end)}`;
};
