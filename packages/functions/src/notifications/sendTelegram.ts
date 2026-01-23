import { logger } from "firebase-functions";

import { escapeMarkdown } from "../lib/text.js";
import { formatErrorMessage, isValidChatId } from "@stall-bokning/shared";

/**
 * Telegram message payload
 */
interface TelegramPayload {
  title: string;
  body: string;
  actionUrl?: string;
}

/**
 * Get Telegram Bot configuration from environment
 */
function getTelegramConfig(): { botToken: string } | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    logger.warn("TELEGRAM_BOT_TOKEN not configured");
    return null;
  }

  return { botToken };
}

/**
 * Format message for Telegram
 * Uses Markdown formatting
 */
function formatTelegramMessage(payload: TelegramPayload): string {
  let message = `*${escapeMarkdown(payload.title)}*\n\n`;
  message += escapeMarkdown(payload.body);

  if (payload.actionUrl) {
    message += `\n\n[Öppna i appen](${payload.actionUrl})`;
  }

  return message;
}

/**
 * Send message via Telegram Bot API
 */
export async function sendTelegramMessage(
  chatId: string,
  payload: TelegramPayload,
): Promise<{ success: boolean; error?: string; invalidChat?: boolean }> {
  const config = getTelegramConfig();

  if (!config) {
    return {
      success: false,
      error: "Telegram not configured - TELEGRAM_BOT_TOKEN missing",
    };
  }

  if (!chatId) {
    return {
      success: false,
      error: "Chat ID is required",
    };
  }

  // Validate chat ID format (must be numeric, can be negative for groups)
  if (!isValidChatId(chatId)) {
    logger.warn(
      { chatIdLength: chatId.length },
      "Invalid Telegram chat ID format",
    );
    return {
      success: false,
      error: "Invalid chat ID format",
      invalidChat: true,
    };
  }

  try {
    const message = formatTelegramMessage(payload);
    // SECURITY: Never log this URL as it contains the bot token
    const apiUrl = `https://api.telegram.org/bot${config.botToken}/sendMessage`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "MarkdownV2",
        disable_web_page_preview: false,
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      const errorDescription = result.description || "Unknown error";

      // Check for invalid chat errors
      const isInvalidChat = [
        "chat not found",
        "user is deactivated",
        "bot was blocked by the user",
        "bot can't initiate conversation with a user",
      ].some((msg) => errorDescription.toLowerCase().includes(msg));

      if (isInvalidChat) {
        logger.warn(
          {
            chatId,
            error: errorDescription,
          },
          "Invalid Telegram chat - should be removed",
        );
        return {
          success: false,
          error: errorDescription,
          invalidChat: true,
        };
      }

      logger.error(
        {
          chatId,
          error: errorDescription,
          errorCode: result.error_code,
        },
        "Telegram API error",
      );

      return {
        success: false,
        error: `Telegram error: ${errorDescription}`,
      };
    }

    logger.info(
      {
        chatId,
        messageId: result.result.message_id,
      },
      "Telegram message sent successfully",
    );

    return { success: true };
  } catch (error) {
    const errorMessage = formatErrorMessage(error);
    logger.error(
      {
        error: errorMessage,
        chatId,
      },
      "Failed to send Telegram message",
    );
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Verify Telegram webhook (for bot commands)
 */
export async function verifyTelegramWebhook(
  webhookUrl: string,
): Promise<{ success: boolean; error?: string }> {
  const config = getTelegramConfig();

  if (!config) {
    return {
      success: false,
      error: "Telegram not configured",
    };
  }

  try {
    const apiUrl = `https://api.telegram.org/bot${config.botToken}/setWebhook`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      return {
        success: false,
        error: result.description || "Failed to set webhook",
      };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = formatErrorMessage(error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get chat info to verify user
 */
export async function getTelegramChatInfo(chatId: string): Promise<{
  success: boolean;
  chatInfo?: Record<string, unknown>;
  error?: string;
}> {
  const config = getTelegramConfig();

  if (!config) {
    return {
      success: false,
      error: "Telegram not configured",
    };
  }

  try {
    const apiUrl = `https://api.telegram.org/bot${config.botToken}/getChat`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      return {
        success: false,
        error: result.description || "Failed to get chat info",
      };
    }

    return {
      success: true,
      chatInfo: result.result,
    };
  } catch (error) {
    const errorMessage = formatErrorMessage(error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
