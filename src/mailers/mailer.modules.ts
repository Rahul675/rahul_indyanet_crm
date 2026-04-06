import { Module } from "@nestjs/common";
import { MailerService } from "./mailer.services";
import { MailerController } from "./mailer.controller";

@Module({
  // MailerController intentionally not registered to keep /mail/health disabled.
  controllers: [],
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}
