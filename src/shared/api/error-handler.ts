export class ApiError extends Error {
  statusCode?: string;

  constructor(message: string, statusCode?: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

export const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
};
