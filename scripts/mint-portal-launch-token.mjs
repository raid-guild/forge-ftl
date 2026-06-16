#!/usr/bin/env node

import crypto from "node:crypto";

const secret = process.env.PORTAL_MODULE_LAUNCH_SECRET;
if (!secret) {
  console.error("PORTAL_MODULE_LAUNCH_SECRET is required.");
  process.exit(1);
}

const now = Math.floor(Date.now() / 1000);
const audience = process.env.PORTAL_MODULE_AUDIENCE ?? "fantasy-trail-legends";
const issuer = process.env.PORTAL_MODULE_ISSUER ?? "https://portal.raidguild.org";
const moduleSlug = process.env.PORTAL_MODULE_SLUG ?? audience;
const userID = process.env.PORTAL_TEST_USER_ID ?? "13";
const profileID = process.env.PORTAL_TEST_PROFILE_ID ?? "36";
const handle = process.env.PORTAL_TEST_HANDLE ?? "demo-raider";
const name = process.env.PORTAL_TEST_NAME ?? "Demo Raider";
const email = process.env.PORTAL_TEST_EMAIL ?? "demo@example.com";

const header = {
  alg: "HS256",
  typ: "JWT",
};

const payload = {
  typ: "portal_module_launch",
  iss: issuer,
  aud: audience,
  sub: `user:${userID}`,
  jti: crypto.randomUUID(),
  userID,
  profileID,
  email,
  name,
  handle,
  roles: ["member"],
  moduleSlug,
  scopes: ["profile:read"],
  iat: now,
  exp: now + 120,
};

const encodedHeader = base64url(JSON.stringify(header));
const encodedPayload = base64url(JSON.stringify(payload));
const signature = crypto
  .createHmac("sha256", secret)
  .update(`${encodedHeader}.${encodedPayload}`)
  .digest("base64url");

const token = `${encodedHeader}.${encodedPayload}.${signature}`;
console.log(token);
console.error("");
console.error(`Callback: http://localhost:3001/portal/callback?token=${token}`);

function base64url(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}
