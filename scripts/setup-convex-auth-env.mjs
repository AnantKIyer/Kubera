/**
 * One-time setup: generates JWT keys and sets Convex Auth env vars.
 * Run: node scripts/setup-convex-auth-env.mjs
 */
import { spawnSync } from "node:child_process";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const keys = await generateKeyPair("RS256", { extractable: true });
const privateKey = (await exportPKCS8(keys.privateKey)).trimEnd().replace(/\n/g, " ");
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

function setEnv(name, value) {
  const result = spawnSync("npx", ["convex", "env", "set", name], {
    cwd: root,
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
    encoding: "utf8",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("Setting Convex Auth environment variables…");
setEnv("JWT_PRIVATE_KEY", privateKey);
setEnv("JWKS", jwks);
setEnv("SITE_URL", "http://localhost:3000");
console.log("Done. JWT_PRIVATE_KEY, JWKS, and SITE_URL are configured.");
