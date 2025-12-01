import { Module } from "@nestjs/common";
import { IssuesService } from "./issues.service";
import { IssuesController } from "./issues.controller";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationService } from "../notifications/notification.service";
import { AuthModule } from "../auth/auth.module"; // ✅ add this

@Module({
  imports: [AuthModule], // ✅ required for jwt guard
  controllers: [IssuesController],
  providers: [IssuesService, PrismaService, AuditService, NotificationService],
})
export class IssuesModule {}
