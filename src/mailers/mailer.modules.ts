import { Module } from "@nestjs/common";
import { MailerService } from "./mailer.services";
import { MailerController } from "./mailer.controller";

@Module({
  controllers: [MailerController],
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}
