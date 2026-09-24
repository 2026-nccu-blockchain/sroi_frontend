import { httpClient } from "@/shared/api/http";
import type {
  CreateFormPayload,
  FormResponse,
  FormSubmission,
  FormStatus,
  PageResponse,
  PublicFormResponse,
  AnswerPayload,
  QuestionPayload,
  QuestionResponse
} from "@/modules/forms/types/form.types";

export const createForm = (payload: CreateFormPayload): Promise<FormResponse> =>
  httpClient.post<FormResponse>("/form", payload);

export const getForm = (formId: string): Promise<FormResponse> =>
  httpClient.get<FormResponse>(`/form/${formId}`);

export const getForms = (): Promise<FormResponse[]> =>
  httpClient.get<FormResponse[]>("/form");

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

export const deleteForm = (formId: string): Promise<void> =>
  httpClient.delete(`/form/${formId}`);

export const createPage = (
  formId: string,
  payload: { title?: string; content: string; position: number; questions: QuestionPayload[] }
): Promise<PageResponse> => httpClient.post<PageResponse>(`/form/${formId}/pages`, payload);

export const updatePage = (
  pageId: string,
  payload: { title?: string; content?: string; position?: number }
): Promise<PageResponse> => httpClient.patch<PageResponse>(`/form/pages/${pageId}`, payload);

export const deletePage = (pageId: string): Promise<void> =>
  httpClient.delete(`/form/pages/${pageId}`);

export const saveFormStructure = (
  formId: string,
  pages: Array<{ page_id: string; question_ids: string[] }>
): Promise<FormResponse> => httpClient.put<FormResponse>(`/form/${formId}/structure`, { pages });

export const getPublicForm = (publicToken: string): Promise<PublicFormResponse> =>
  httpClient.get<PublicFormResponse>(`/form/public/${publicToken}`);

export const submitPublicForm = (
  publicToken: string,
  respondentEmail: string,
  answers: AnswerPayload[]
): Promise<unknown> => httpClient.post(`/form/public/${publicToken}/responses`, {
  respondent_email: respondentEmail || null,
  answers
});
