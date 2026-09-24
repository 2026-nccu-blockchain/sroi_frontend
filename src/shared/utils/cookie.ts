import Cookies from "js-cookie";

interface SetCookieOptions {
  days?: number;
  path?: string;
}

export const setCookie = (name: string, value: string, options: SetCookieOptions = {}): void => {
  const { days = 7, path = "/" } = options;

  Cookies.set(name, value, {
    expires: days,
    path,
    sameSite: "lax",
    secure: window.location.protocol === "https:"
  });
};

export const getCookie = (name: string): string | null => Cookies.get(name) ?? null;

export const removeCookie = (name: string, path = "/"): void => {
  Cookies.remove(name, { path });
};