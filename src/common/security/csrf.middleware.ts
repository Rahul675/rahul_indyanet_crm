import { randomBytes } from "crypto";
import type { NextFunction, Request, Response } from "express";

export const CSRF_COOKIE_NAME = "csrf_token";
export const CSRF_HEADER_NAME = "x-csrf-token";

export function parseCookieValue(rawCookie: string | undefined, name: string) {
  if (!rawCookie) return undefined;
  const pairs = rawCookie.split(";").map((part) => part.trim());
  for (const pair of pairs) {
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = pair.slice(0, separatorIndex).trim();
    if (key !== name) continue;
    return decodeURIComponent(pair.slice(separatorIndex + 1).trim());
  }
  return undefined;
}

function parseCookieValues(rawCookie: string | undefined, name: string) {
  if (!rawCookie) return [] as string[];

  const pairs = rawCookie.split(";").map((part) => part.trim());
  const values: string[] = [];
  for (const pair of pairs) {
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = pair.slice(0, separatorIndex).trim();
    if (key !== name) continue;
    values.push(decodeURIComponent(pair.slice(separatorIndex + 1).trim()));
  }

  return values;
}

export function isUnsafeMethod(method?: string) {
  const upper = (method || "").toUpperCase();
  return upper === "POST" || upper === "PUT" || upper === "PATCH" || upper === "DELETE";
}

function normalizePath(path?: string) {
  if (!path) return "";
  return path.split("?")[0] || "";
}

function isCsrfExemptPath(path?: string) {
  const normalizedPath = normalizePath(path);
  return (
    normalizedPath === "/api/v1/auth/login" ||
    normalizedPath === "/api/v1/auth/register" ||
    normalizedPath === "/api/v1/auth/forgot-password" ||
    normalizedPath === "/api/v1/auth/reset-password"
  );
}

export function shouldEnforceCsrf(req: Request) {
  if (!isUnsafeMethod(req.method)) return false;
  if (isCsrfExemptPath(req.originalUrl || req.url)) return false;

  const rawCookie = req.headers.cookie;
  const hasAccessCookie = Boolean(parseCookieValue(rawCookie, "access_token"));
  const hasRefreshCookie = Boolean(parseCookieValue(rawCookie, "refresh_token"));

  // Enforce CSRF only for cookie-authenticated writes.
  return hasAccessCookie || hasRefreshCookie;
}

export function setCsrfCookie(res: Response, token: string) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function csrfProtectionMiddleware(req: Request, res: Response, next: NextFunction) {
  const csrfCookieValues = parseCookieValues(req.headers.cookie, CSRF_COOKIE_NAME);
  const csrfToken =
    csrfCookieValues[csrfCookieValues.length - 1] || randomBytes(32).toString("hex");

  if (csrfCookieValues.length === 0) {
    setCsrfCookie(res, csrfToken);
  }

  if (shouldEnforceCsrf(req)) {
    const headerValue = req.headers[CSRF_HEADER_NAME] as string | string[] | undefined;
    const normalizedHeader = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;

    const isHeaderValid =
      typeof normalizedHeader === "string" &&
      csrfCookieValues.includes(normalizedHeader);

    if (!isHeaderValid) {
      return res.status(403).json({
        success: false,
        message: "Invalid or missing CSRF token.",
      });
    }
  }

  return next();
}
