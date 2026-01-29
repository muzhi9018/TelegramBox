import {MessageContext} from "@mtcute/dispatcher";
import {Message} from "@mtcute/core";
import {BasePlugin, PluginContext, PluginScope} from "../../core/base-plugin.js";

const parsePositiveInt = (value: string | null | undefined, fallback: number): number => {
    const parsed = Number.parseInt(value ?? "", 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return parsed;
};

const isForwardRestricted = (error: unknown): boolean => {
    const text =
        (typeof error === "string" ? error : null) ??
        (error as { message?: string })?.message ??
        (error as { text?: string })?.text ??
        (error as { errorMessage?: string })?.errorMessage ??
        "";
    return /CHAT_FORWARDS_RESTRICTED|FORWARDS_RESTRICTED|MESSAGE_COPY_FORBIDDEN/i.test(text);
};

export class RePlugin extends BasePlugin {
    command = "re";
    name = "复读";
    description: string;
    scope = "new_message" as PluginScope;

    constructor(context: PluginContext) {
        super(context);
        const mainPrefix = this.context.env.COMMAND_PREFIXES[0] ?? "/";
        this.description = `复读</br>回复一条消息即可复读</br><code>${mainPrefix}re [消息数] [复读次数]</code>`;
    }

    protected async handlerCommand(message: MessageContext, command: string, args: string[]): Promise<void> {
        const count = parsePositiveInt(command, 1);
        const repeat = parsePositiveInt(args[0], 1);

        try {
            const replyTo = await message.getReplyTo();
            if (!replyTo) {
                await message.edit({text: "你必须回复一条消息才能够进行复读"});
                return;
            }

            const history = await this.context.client.getHistory(message.chat.id, {
                limit: count,
                reverse: true,
                offset: {
                    id: replyTo.id,
                    date: Math.floor(replyTo.date.getTime() / 1000)
                }
            });

            const messages: Message[] = Array.from(history);
            if (messages.length === 0) {
                await message.edit({text: "未获取到可复读的消息"});
                return;
            }

            const threadId = message.replyToMessage?.threadId ?? undefined;
            const hasContentProtected = messages.some((item) => item.isContentProtected);

            await message.delete();

            if (!hasContentProtected) {
                try {
                    for (let i = 0; i < repeat; i += 1) {
                        await this.context.client.forwardMessages({
                            toChatId: message.chat.id,
                            messages,
                            ...(threadId ? {toThreadId: threadId} : {})
                        });
                    }
                    return;
                } catch (error) {
                    if (!isForwardRestricted(error)) {
                        throw error;
                    }
                }
            }

            for (let i = 0; i < repeat; i += 1) {
                for (const item of messages) {
                    await this.context.client.sendCopy({
                        toChatId: message.chat.id,
                        message: item,
                        ...(threadId ? {replyTo: threadId} : {})
                    });
                }
            }
        } catch (error) {
            const errorText =
                (error as { message?: string })?.message ??
                "发生错误，无法复读消息。请稍后再试。";
            await this.context.client.sendText(message.chat.id, errorText);
        }
    }

    protected async handleMessage(message: MessageContext): Promise<void> {
    }
}

export const Plugin = RePlugin;
