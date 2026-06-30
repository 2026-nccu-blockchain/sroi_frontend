export const httpClient = {
  get: async <T>(data: T): Promise<T> => Promise.resolve(data)
};
