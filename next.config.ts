import type { NextConfig } from "next";

/**
 * ONE ORIGIN. The browser talks only to this app; Next forwards API calls:
 *
 *   /api/fleet/*  → Fleet API (5300)      — must come first, it is the more specific rule
 *   /api/*        → Platform API (5100)   — e.g. GET /api/branches
 *   /auth/*       → Platform API (5100)   — login, refresh, logout, me
 *
 * Why: the APIs have no CORS, and the refresh cookie (__Secure-gecko_rt, HttpOnly,
 * SameSite=Strict, Path=/auth) only works when /auth is on this app's own address.
 * The cookie is Secure, so run `npm run dev` (https): over plain http the browser
 * drops it and every page reload signs the user out.
 *
 * These are "afterFiles" rewrites: this app's own routes still win.
 */
const PLATFORM_API_ORIGIN = resolveOrigin('PLATFORM_API_ORIGIN', 'http://localhost:5100');
const FLEET_API_ORIGIN = resolveOrigin('FLEET_API_ORIGIN', 'http://localhost:5300');

/** Local default in development; production must name the API, over https. */
function resolveOrigin(name: string, devDefault: string): string {
  const configured = process.env[name]?.trim().replace(/\/+$/, '');
  if (process.env.NODE_ENV !== 'production') return configured || devDefault;
  if (!configured) throw new Error(`${name} is not set. Set it for this build.`);
  if (!configured.startsWith('https://') && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(configured))
    throw new Error(`${name} must be https:// in production (got ${configured}).`);
  return configured;
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      { source: '/api/fleet/:path*', destination: `${FLEET_API_ORIGIN}/api/fleet/:path*` },
      { source: '/api/:path*', destination: `${PLATFORM_API_ORIGIN}/api/:path*` },
      { source: '/auth/:path*', destination: `${PLATFORM_API_ORIGIN}/auth/:path*` },
    ];
  },
};

export default nextConfig;
