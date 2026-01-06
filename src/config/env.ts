import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envName = process.env.NODE_ENV ?? "development";
const envFile = path.resolve(__dirname, "../../.env." + envName);

dotenv.config({ path: envFile });

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const apiIdRaw = requireEnv("API_ID");
const apiId = Number(apiIdRaw);
if (!Number.isFinite(apiId)) {
  throw new Error(`API_ID must be a number, got: ${apiIdRaw}`);
}

const allowedChatIds = (process.env.ALLOWED_CHAT_IDS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)
  .map((value) => Number(value))
  .filter((value) => Number.isFinite(value));

export const env = {
  nodeEnv: envName,
  apiId,
  apiHash: requireEnv("API_HASH"),
  storagePath: process.env.SESSION_PATH ?? "data/session",
  allowedChatIds: new Set<number>(allowedChatIds)
};
