import "vue-router";

declare module "vue-router" {
  interface RouteMeta {
    requiresAuth?: boolean;
    // 有設定時，只有這些角色可以進入
    roles?: string[];
  }
}
