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
import * as nodemailer from "nodemailer";

@Injectable()
export class MailerService implements OnModuleInit {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter | null = null;

  onModuleInit() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.EMAIL_FROM || user;

    if (!host || !user || !pass) {
      this.logger.warn(
        "SMTP not configured (missing SMTP_HOST / SMTP_USER / SMTP_PASS). Mailer disabled."
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for 587 (STARTTLS)
      auth: {
        user,
        pass,
      },
      logger: false,
      debug: false,
      tls: {
        // If you encounter certificate issues while debugging, set to false temporarily.
        rejectUnauthorized: true,
      },
    });

    this.transporter.verify((err, success) => {
      if (err) {
        this.logger.error("SMTP verification failed", err);
      } else {
        this.logger.log(
          `SMTP transporter verified (host=${host} port=${port} from=${from})`
        );
      }
    });
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
      this.logger.error(
        `Failed to send email to ${to}: ${(error as any)?.message || error}`
      );
      return { success: false, error };
    }
  }
}
