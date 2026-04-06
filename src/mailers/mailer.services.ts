import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
 
const TRANSIENT_HTTP_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const TRANSIENT_ERROR_CODES = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNREFUSED",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
]);

type MailHealthStatus = "ok" | "error" | "not_configured" | "unknown";

type MailHealthVerification = {
  status: MailHealthStatus;
  checkedAt: string | null;
  message: string | null;
  code: string | null;
};

@Injectable()
export class MailerService implements OnModuleInit {
  private readonly logger = new Logger(MailerService.name);
  private apiBaseUrl = "https://api.brevo.com/v3";
  private apiKey = "";
  private fromEmail = "";
  private fromName = "Indyanet CRM";
  private timeoutMs = 10000;
  private maxRetries = 2;
  private configured = false;
  private lastVerification: MailHealthVerification = {
    status: "unknown",
    checkedAt: null,
    message: null,
    code: null,
  };

  private isTransientError(error: unknown) {
    const code = (error as any)?.code;
    const status = (error as any)?.status;
    return (
      (typeof code === "string" && TRANSIENT_ERROR_CODES.has(code)) ||
      (typeof status === "number" && TRANSIENT_HTTP_STATUS.has(status))
    );
  }

  private async sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private createTimeoutSignal(timeoutMs: number) {
    const controller = new AbortController();
    const timeoutRef = setTimeout(() => controller.abort(), timeoutMs);
    return { signal: controller.signal, timeoutRef };
  }

  private buildHeaders() {
    return {
      "api-key": this.apiKey,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }

  private parseHttpErrorBody(data: any) {
    if (!data) return "Unknown API error";
    if (typeof data === "string") return data;
    if (Array.isArray(data?.message)) return data.message.join(", ");
    if (typeof data?.message === "string") return data.message;
    if (typeof data?.code === "string") return data.code;
    try {
      return JSON.stringify(data);
    } catch {
      return "Unknown API error";
    }
  }

  private async brevoRequest(path: string, init: RequestInit) {
    const { signal, timeoutRef } = this.createTimeoutSignal(this.timeoutMs);

    try {
      const response = await fetch(`${this.apiBaseUrl}${path}`, {
        ...init,
        signal,
      });

      const raw = await response.text();
      let data: any = null;
      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          data = raw;
        }
      }

      if (!response.ok) {
        const err: any = new Error(this.parseHttpErrorBody(data));
        err.status = response.status;
        err.response = data;
        throw err;
      }

      return data;
    } catch (error: any) {
      if (error?.name === "AbortError") {
        const timeoutError: any = new Error(
          `Brevo API request timed out after ${this.timeoutMs}ms`
        );
        timeoutError.code = "ETIMEDOUT";
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timeoutRef);
    }
  }

  private async verifyApi() {
    try {
      await this.brevoRequest("/account", {
        method: "GET",
        headers: this.buildHeaders(),
      });

      this.lastVerification = {
        status: "ok",
        checkedAt: new Date().toISOString(),
        message: "Brevo API key verified",
        code: null,
      };
      return;
    } catch (error) {
      this.lastVerification = {
        status: "error",
        checkedAt: new Date().toISOString(),
        message: (error as any)?.message || "Brevo verification failed",
        code:
          String((error as any)?.status || "") ||
          String((error as any)?.code || "") ||
          null,
      };

      if (this.isTransientError(error)) {
        this.logger.warn(
          `Brevo verification transient error (${(error as any)?.status || (error as any)?.code}). Mailer will retry on send.`
        );
      } else {
        this.logger.error("Brevo API verification failed", error as any);
      }
    }
  }

  async onModuleInit() {
    this.apiBaseUrl = process.env.BREVO_API_BASE_URL || "https://api.brevo.com/v3";
    this.apiKey = process.env.BREVO_API_KEY || "";
    this.fromEmail = process.env.EMAIL_FROM || process.env.BREVO_SENDER_EMAIL || "";
    this.fromName = process.env.BREVO_SENDER_NAME || "Indyanet CRM";
    this.timeoutMs = Number(process.env.BREVO_HTTP_TIMEOUT_MS) || 10000;
    this.maxRetries = Number(process.env.BREVO_MAX_RETRIES) || 2;

    this.configured = Boolean(this.apiKey && this.fromEmail);

    if (!this.configured) {
      this.lastVerification = {
        status: "not_configured",
        checkedAt: new Date().toISOString(),
        message: "Brevo mailer not configured (missing BREVO_API_KEY or EMAIL_FROM).",
        code: null,
      };
      this.logger.warn(
        "Brevo mailer not configured (missing BREVO_API_KEY or EMAIL_FROM). Mailer disabled."
      );
      return;
    }

    await this.verifyApi();
  }

  async getHealth(options?: { live?: boolean }) {
    if (options?.live && this.configured) {
      await this.verifyApi();
    }

    return {
      success: true,
      provider: "brevo-http-api",
      configured: this.configured,
      apiBaseUrl: this.apiBaseUrl,
      from: this.fromEmail || null,
      senderName: this.fromName,
      verification: this.lastVerification,
      httpTimeoutMs: this.timeoutMs,
      maxRetries: this.maxRetries,
    };
  }

  /**
   * Send an email. Returns structured result instead of throwing so callers can decide behavior.
   */
  async send(
    to: string,
    subject: string,
    html: string,
    opts?: { from?: string; text?: string }
  ): Promise<{ success: boolean; info?: any; error?: any }> {
    if (!this.configured) {
      const errMsg =
        "Brevo mailer not configured; check BREVO_API_KEY and EMAIL_FROM/BREVO_SENDER_EMAIL.";
      this.logger.error(errMsg);
      return { success: false, error: errMsg };
    }

    const fromAddress = opts?.from || this.fromEmail;
    const payload = {
      sender: {
        email: fromAddress,
        name: this.fromName,
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: opts?.text || undefined,
    };

    let attempt = 0;
    const totalAttempts = this.maxRetries + 1;

    while (attempt < totalAttempts) {
      try {
        const info = await this.brevoRequest("/smtp/email", {
          method: "POST",
          headers: this.buildHeaders(),
          body: JSON.stringify(payload),
        });

        this.logger.log(`Email sent to ${to} via Brevo messageId=${info?.messageId}`);
        return { success: true, info };
      } catch (error) {
        attempt += 1;
        const retryable = this.isTransientError(error);

        if (attempt < totalAttempts && retryable) {
          const backoffMs = 500 * Math.pow(2, attempt - 1);
          this.logger.warn(
            `Transient Brevo error on attempt ${attempt}/${totalAttempts} for ${to} (${(error as any)?.status || (error as any)?.code || "UNKNOWN"}). Retrying in ${backoffMs}ms.`
          );
          await this.sleep(backoffMs);
          continue;
        }

        this.logger.error(
          `Failed to send email to ${to} via Brevo after ${attempt} attempt(s): ${(error as any)?.message || error}`
        );
        return { success: false, error };
      }
    }

    const exhaustedError = "Failed to send email after retry attempts.";
    this.logger.error(exhaustedError);
    return { success: false, error: exhaustedError };
  }
}
