import { randomBytes } from "node:crypto";
import { knownFeatureScriptBodies } from "../features/registry.js";

export function secureHtml(source: string): { body: string; csp: string } {
  const nonce = randomBytes(18).toString("base64");
  const body = source.replace(
    /<script data-marksites-script="true">([\s\S]*?)<\/script>/g,
    (whole, content: string) =>
      knownFeatureScriptBodies.has(content)
        ? `<script data-marksites-script="true" nonce="${nonce}">${content}</script>`
        : whole,
  );
  return {
    body,
    csp: `default-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'nonce-${nonce}'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`,
  };
}
