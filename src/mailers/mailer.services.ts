// import { Injectable } from "@nestjs/common";
// import * as nodemailer from "nodemailer";

// @Injectable()
// export class MailerService {
//   private transporter = nodemailer.createTransport({
//     host: process.env.SMTP_HOST,
//     port: Number(process.env.SMTP_PORT) || 587,
//     secure: false,
//     auth: {
//       user: process.env.SMTP_USER,
//       pass: process.env.SMTP_PASS,
//     },
//   });

//   async send(to: string, subject: string, html: string) {
//     return this.transporter.sendMail({
//       from: "Indyanet HRM <hrmindiyanet@gmail.com>",
//       to,
//       subject,
//       html,
//     });
//   }
// }

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import * as nodemailer from "nodemailer";

const TRANSIENT_SMTP_ERROR_CODES = new Set([
  "ETIMEOUT",
  "EDNS",
  "EAI_AGAIN",
  "ENOTFOUND",
  "ECONNRESET",
  "ECONNREFUSED",
]);

@Injectable()
export class MailerService implements OnModuleInit {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter | null = null;
  private smtpHost = "";
  private smtpConnectHost = "";
  private smtpPort = 587;
  private smtpFrom = "";
  private configured = false;
  private lastVerification: {
    status: "ok" | "error" | "not_configured" | "unknown";
    checkedAt: string | null;
    message: string | null;
    code: string | null;
  } = {
    status: "unknown",
    checkedAt: null,
    message: null,
    code: null,
  };

  private isTransientSmtpError(error: unknown) {
    const code = (error as any)?.code;
    return typeof code === "string" && TRANSIENT_SMTP_ERROR_CODES.has(code);
  }

  private async sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async resolveSmtpConnectHost(host: string): Promise<string> {
    if (isIP(host)) {
      return host;
    }

    const preferredFamily = Number(process.env.SMTP_LOOKUP_FAMILY) || 4;
    try {
      const resolved = await lookup(host, { family: preferredFamily as 4 | 6 });
      return resolved.address;
    } catch (error) {
      this.logger.warn(
        `SMTP host lookup via OS resolver failed for ${host}: ${(error as any)?.message || error}. Falling back to hostname.`
      );
      return host;
    }
  }

  async onModuleInit() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.EMAIL_FROM || user;

    this.smtpHost = host || "";
    this.smtpPort = port;
    this.smtpFrom = from || "";
    this.configured = Boolean(host && user && pass);

    if (!host || !user || !pass) {
      this.lastVerification = {
        status: "not_configured",
        checkedAt: new Date().toISOString(),
        message:
          "SMTP not configured (missing SMTP_HOST / SMTP_USER / SMTP_PASS). Mailer disabled.",
        code: null,
      };
      this.logger.warn(
        "SMTP not configured (missing SMTP_HOST / SMTP_USER / SMTP_PASS). Mailer disabled."
      );
      return;
    }

    const connectHost = await this.resolveSmtpConnectHost(host);
    const useTlsServerName = connectHost !== host && !isIP(host);
    this.smtpConnectHost = connectHost;

    this.transporter = nodemailer.createTransport({
      host: connectHost,
      port,
      secure: port === 465, // true for 465, false for 587 (STARTTLS)
      connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS) || 10000,
      greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS) || 10000,
      socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS) || 20000,
      dnsTimeout: Number(process.env.SMTP_DNS_TIMEOUT_MS) || 10000,
      auth: {
        user,
        pass,
      },
      logger: false,
      debug: false,
      tls: {
        servername: useTlsServerName ? host : undefined,
        // If you encounter certificate issues while debugging, set to false temporarily.
        rejectUnauthorized: true,
      },
    });

    try {
      await this.transporter.verify();
      this.lastVerification = {
        status: "ok",
        checkedAt: new Date().toISOString(),
        message: "SMTP transporter verified",
        code: null,
      };
      this.logger.log(
        `SMTP transporter verified (host=${host} connectHost=${connectHost} port=${port} from=${from})`
      );
    } catch (err) {
      this.lastVerification = {
        status: "error",
        checkedAt: new Date().toISOString(),
        message: (err as any)?.message || "SMTP verification failed",
        code: (err as any)?.code || null,
      };
      if (this.isTransientSmtpError(err)) {
        this.logger.warn(
          `SMTP verification timeout/network issue (${(err as any)?.code}). Mailer will keep retrying on send.`
        );
      } else {
        this.logger.error("SMTP verification failed", err as any);
      }
    }
  }

  async getHealth(options?: { live?: boolean }) {
    if (options?.live && this.transporter) {
      try {
        await this.transporter.verify();
        this.lastVerification = {
          status: "ok",
          checkedAt: new Date().toISOString(),
          message: "SMTP transporter verified",
          code: null,
        };
      } catch (error) {
        this.lastVerification = {
          status: "error",
          checkedAt: new Date().toISOString(),
          message: (error as any)?.message || "SMTP verification failed",
          code: (error as any)?.code || null,
        };
      }
    }

    return {
      success: true,
      configured: this.configured,
      transporterReady: Boolean(this.transporter),
      host: this.smtpHost || null,
      connectHost: this.smtpConnectHost || this.smtpHost || null,
      port: this.smtpPort,
      from: this.smtpFrom || null,
      verification: this.lastVerification,
      timeouts: {
        connectionTimeoutMs: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS) || 10000,
        greetingTimeoutMs: Number(process.env.SMTP_GREETING_TIMEOUT_MS) || 10000,
        socketTimeoutMs: Number(process.env.SMTP_SOCKET_TIMEOUT_MS) || 20000,
        dnsTimeoutMs: Number(process.env.SMTP_DNS_TIMEOUT_MS) || 10000,
      },
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
    if (!this.transporter) {
      const errMsg =
        "Mailer transporter not initialized; check SMTP env vars (SMTP_HOST/SMTP_USER/SMTP_PASS).";
      this.logger.error(errMsg);
      return { success: false, error: errMsg };
    }

    const from = opts?.from || process.env.EMAIL_FROM || process.env.SMTP_USER;
    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject,
        text: opts?.text || undefined,
        html,
      });
      this.logger.log(`Email sent to ${to} messageId=${info?.messageId}`);
      return { success: true, info };
    } catch (error) {
      if (this.isTransientSmtpError(error)) {
        this.logger.warn(
          `Transient SMTP error (${(error as any)?.code}) while sending to ${to}. Retrying once...`
        );
        await this.sleep(1000);

        try {
          const info = await this.transporter.sendMail({
            from,
            to,
            subject,
            text: opts?.text || undefined,
            html,
          });
          this.logger.log(`Email sent to ${to} messageId=${info?.messageId}`);
          return { success: true, info };
        } catch (retryError) {
          this.logger.error(
            `Failed to send email to ${to} after retry: ${(retryError as any)?.message || retryError}`
          );
          return { success: false, error: retryError };
        }
      }

      this.logger.error(
        `Failed to send email to ${to}: ${(error as any)?.message || error}`
      );
      return { success: false, error };
    }
  }
}
