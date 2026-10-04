import { createRemoteJWKSet, jwtVerify } from "jose";

export function createNeonAuth({ baseUrl, jwksUrl }) {
  if (!baseUrl || !jwksUrl) return async () => null;
  const jwks = createRemoteJWKSet(new URL(jwksUrl));
  const issuer = new URL(baseUrl).origin;

  return async (request) => {
    const authorization = request.headers.get("authorization");
    if (!authorization?.toLowerCase().startsWith("bearer ")) return null;
    try {
      const { payload } = await jwtVerify(authorization.slice(7), jwks, { issuer });
      return typeof payload.sub === "string" ? { id: payload.sub } : null;
    } catch {
      return null;
    }
  };
}
