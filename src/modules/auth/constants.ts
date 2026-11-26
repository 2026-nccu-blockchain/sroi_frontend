// 可以使用工作區（我的專案、我的群組）的角色
export const WORKSPACE_ROLES = ["admin", "db_editor", "normal"];

export const ADMIN_ROLES = ["admin"];

// 這些在學驗證狀態只能使用驗證頁
export const ENROLLMENT_BLOCKING_STATES = ["required", "rejected", "expired"];

// 可以審核專案（共用資料庫的「審核專案」分頁）的角色
export const PROJECT_REVIEWER_ROLES = ["db_editor", "admin"];
