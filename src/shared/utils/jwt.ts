export interface JwtPayload {
  exp?: number;
  [claim: string]: unknown;
}

export const decodeJwt = <T extends JwtPayload = JwtPayload>(token: string): T | null => {
  const segments = token.split(".");
  if (segments.length !== 3) return null;

  try {
    const base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );

    return JSON.parse(json) as T;
  } catch {
    return null;
  }
};

export const isJwtExpired = (payload: JwtPayload | null): boolean => {
  if (!payload?.exp) return false;
  return Date.now() >= payload.exp * 1000;
};