import "vue-router";

declare module "vue-router" {
  interface RouteMeta {
    // 沒有登入也能進入；其他頁面沒有 token 一律導到登入頁
    public?: boolean;
    // 有設定時，只有這些角色可以進入
    roles?: string[];
  }
}
