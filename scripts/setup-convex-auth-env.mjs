#!/usr/bin/env node
/**
 * Generates JWT keys and sets Convex Auth env vars on the linked dev deployment.
 * Run: node scripts/setup-convex-auth-env.mjs [SITE_URL]
 * Default SITE_URL: http://localhost:3000
 */
import { execSync } from "child_process";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const siteUrl = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");

async function main() {
  const keys = await generateKeyPair("RS256", { extractable: true });
  const privateKey = await exportPKCS8(keys.privateKey);
  const publicKey = await exportJWK(keys.publicKey);
  const jwtPrivateKey = privateKey.trimEnd().replace(/\n/g, " ");
  const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

  const vars = [
    ["SITE_URL", siteUrl],
    ["JWT_PRIVATE_KEY", jwtPrivateKey],
    ["JWKS", jwks],
  ];

  for (const [name, value] of vars) {
    const escaped = value.replace(/"/g, '\\"');
    console.log(`Setting ${name} on Convex deployment…`);
    execSync(`npx convex env set -- ${name} "${escaped}"`, {
      stdio: "inherit",
      cwd: new URL("..", import.meta.url).pathname,
    });
  }

  console.log("\nDone. Restart `npx convex dev` if it is running, then try login again.");
  console.log(`SITE_URL=${siteUrl}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
