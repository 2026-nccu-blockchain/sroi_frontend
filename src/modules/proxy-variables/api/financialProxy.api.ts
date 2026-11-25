
import { httpClient } from "@/shared/api/http";

export const proxyCurrencies = {
  TWD: "新臺幣", USD: "美元", JPY: "日圓", EUR: "歐元", GBP: "英鎊",
  HKD: "港幣", CNY: "人民幣", AUD: "澳幣", KRW: "韓元", SGD: "新加坡元",
  CAD: "加幣", CHF: "瑞士法郎", THB: "泰銖", VND: "越南盾", MYR: "馬來西亞令吉",
  IDR: "印尼盾", PHP: "菲律賓披索", NZD: "紐西蘭元", INR: "印度盧比"
} as const;

export type ProxyCurrency = keyof typeof proxyCurrencies;
export type ProxyReviewStatus = "pending" | "approved" | "rejected";
export const proxyReviewLabels: Record<ProxyReviewStatus, string> = {
  pending: "待審核",
  approved: "已通過",
  rejected: "已退回"
};

export interface FinancialProxy {
  proxy_id: string;
  name: string;
  value: string;
  currency: ProxyCurrency;
  unit?: string;
  note: string;
  review_status: ProxyReviewStatus;
}

export interface FinancialProxyInput {
  name: string;
  value: string;
  currency: ProxyCurrency;
  unit?: string;
  note: string;
}

export interface FinancialProxyOption extends FinancialProxy {
  value_twd: string | null;
  exchange_rate: string | null;
  exchange_rate_date: string | null;
}

export const getFinancialProxies = (): Promise<FinancialProxy[]> =>
  httpClient.get<FinancialProxy[]>("/financial-proxy");

export const getFinancialProxyCatalog = (): Promise<FinancialProxy[]> =>
  httpClient.get<FinancialProxy[]>("/financial-proxy/catalog");

export const getFinancialProxyOptions = (month: string | null): Promise<FinancialProxyOption[]> =>
  httpClient.get<FinancialProxyOption[]>(
    month ? `/financial-proxy/options?exchange_rate_month=${encodeURIComponent(month)}` : "/financial-proxy/options"
  );

export const getPendingFinancialProxies = (): Promise<FinancialProxy[]> =>
  httpClient.get<FinancialProxy[]>("/financial-proxy/reviewing");

export const reviewFinancialProxy = (id: string, approved: boolean): Promise<FinancialProxy> =>
  httpClient.post<FinancialProxy>(`/financial-proxy/${encodeURIComponent(id)}/review`, { approved });

export const createFinancialProxy = (
  data: FinancialProxyInput
): Promise<FinancialProxy> =>
  httpClient.post<FinancialProxy>("/financial-proxy", data);

export const updateFinancialProxy = (
  id: string,
  data: FinancialProxyInput
): Promise<FinancialProxy> =>
  httpClient.put<FinancialProxy>(
    `/financial-proxy/${encodeURIComponent(id)}`,
    data
  );

export const deleteFinancialProxy = (id: string): Promise<void> =>
  httpClient.delete<void>(
    `/financial-proxy/${encodeURIComponent(id)}`
  );
