export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  user_id: string;
  email: string;
  token: string;
}
