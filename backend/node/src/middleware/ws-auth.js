import { AUTH_COOKIE_NAME } from "../config/auth.js";
import { parseCookies } from "../utils/cookies.js";
import { getSessionTokenFromCookies, requireApiSession } from "./api-auth.js";

export async function verifyWebSocketSession(request) {
  const cookies = parseCookies(request.headers.cookie);
  const session = await requireApiSession(getSessionTokenFromCookies(cookies));

  return Boolean(session);
}
