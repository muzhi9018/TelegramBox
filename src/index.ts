import fs from "node:fs";
import path from "node:path";
import { TelegramClient } from "@mtcute/node";
import { Dispatcher, filters } from "@mtcute/dispatcher";
import { env } from "./config/env.js";

const ensureStorageDir = (storagePath: string) => {
  const dir = path.dirname(storagePath);
  if (dir && dir !== ".") {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const isAllowedChat = (chatId?: number) => {
  if (env.allowedChatIds.size === 0) {
    return true;
  }
  return chatId !== undefined && env.allowedChatIds.has(chatId);
};

ensureStorageDir(env.storagePath);

const tg = new TelegramClient({
  apiId: env.apiId,
  apiHash: env.apiHash,
  storage: env.storagePath,
  updates: {
    catchUp: true,
    messageGroupingInterval: 250
  }
});

const self = await tg.start({
  phone: () => tg.input("Phone > "),
  code: () => tg.input("Code > "),
  password: () => tg.input("Password > ")
});

console.log(`Logged in as ${self.displayName}`);

const dp = Dispatcher.for(tg);

dp.onNewMessage(filters.command("ping"), async (message) => {
  if (!isAllowedChat(message.chat?.id)) return;
  await message.replyText("pong");
});

dp.onNewMessage(filters.command("id"), async (message) => {
  if (!isAllowedChat(message.chat?.id)) return;
  const chatId = message.chat?.id ?? "unknown";
  await message.replyText(`chatId: ${chatId}`);
});

dp.onNewMessage(async (message) => {
    console.log(message);
});
