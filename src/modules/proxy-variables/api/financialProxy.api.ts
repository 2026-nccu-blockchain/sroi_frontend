
import { httpClient } from "@/shared/api/http";

export interface FinancialProxy {
  proxy_id: string;
  name: string;
  value: number;
  note: string;
}

export interface FinancialProxyInput {
  name: string;
  value: number;
  note: string;
}

export const getFinancialProxies = (): Promise<FinancialProxy[]> =>
  httpClient.get<FinancialProxy[]>("/financial-proxy");

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
