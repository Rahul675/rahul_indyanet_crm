import { Module } from "@nestjs/common";
import { OperatorService } from "./operator.service";
import { OperatorController } from "./operator.controller";
import { MailerModule } from "../../mailers/mailer.modules";
import { MailerService } from "../../mailers/mailer.services";
import { AuditModule } from "../audit/audit.module";
import { NotificationModule } from "../notifications/notifications.module";

@Module({
  imports: [MailerModule, AuditModule, NotificationModule],
  controllers: [OperatorController],
  providers: [OperatorService],
})
export class OperatorModule {}
