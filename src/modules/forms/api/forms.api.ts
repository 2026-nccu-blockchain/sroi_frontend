import { httpClient } from "@/shared/api/http";
import type {
  CreateFormPayload,
  FormResponse,
  FormSubmission,
  FormStatus,
  QuestionPayload,
  QuestionResponse
} from "@/modules/forms/types/form.types";

export const createForm = (payload: CreateFormPayload): Promise<FormResponse> =>
  httpClient.post<FormResponse>("/form", payload);

export const getForm = (formId: string): Promise<FormResponse> =>
  httpClient.get<FormResponse>(`/form/${formId}`);

export const getFormSubmissions = (formId: string): Promise<FormSubmission[]> =>
  httpClient.get<FormSubmission[]>(`/form/${formId}/responses`);

export const updateForm = (
  formId: string,
  payload: { title?: string; content?: string; status?: FormStatus }
): Promise<FormResponse> => httpClient.patch<FormResponse>(`/form/${formId}`, payload);

export const createQuestion = (
  formId: string,
  pageId: string,
  payload: QuestionPayload
): Promise<QuestionResponse> =>
  httpClient.post<QuestionResponse>(`/form/${formId}/pages/${pageId}/questions`, payload);

export const updateQuestion = (
  questionId: string,
  payload: Partial<QuestionPayload>
): Promise<QuestionResponse> =>
  httpClient.patch<QuestionResponse>(`/form/questions/${questionId}`, payload);

export const deleteQuestion = (questionId: string): Promise<void> =>
  httpClient.delete(`/form/questions/${questionId}`);

export const saveFormStructure = (
  formId: string,
  pages: Array<{ page_id: string; question_ids: string[] }>
): Promise<FormResponse> => httpClient.put<FormResponse>(`/form/${formId}/structure`, { pages });
