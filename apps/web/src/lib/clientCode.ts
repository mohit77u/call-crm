import { randomInt } from "node:crypto";
import { queryOne } from "./db";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length = 8) {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export async function generateUniqueClientCode() {
  for (let i = 0; i < 10; i++) {
    const code = randomCode();
    const taken = await queryOne("SELECT 1 FROM companies WHERE client_code = $1", [code]);
    if (!taken) return code;
  }
  throw new Error("Could not generate a unique client code");
}

export function normalizeClientCode(code: unknown) {
  return String(code ?? "").trim().toUpperCase();
}
