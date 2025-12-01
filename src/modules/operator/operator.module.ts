import { Module } from "@nestjs/common";
import { OperatorService } from "./operator.service";
import { OperatorController } from "./operator.controller";
import { PrismaService } from "../../prisma/prisma.service";
import { MailerModule } from "../../mailers/mailer.modules";
import { MailerService } from "../../mailers/mailer.services";

@Module({
  imports: [MailerModule],
  controllers: [OperatorController],
  providers: [OperatorService, PrismaService],
})
export class OperatorModule {}
