import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./prisma/prisma.module";
import { PrismaService } from "./prisma/prisma.service";
import { CustomersModule } from "./modules/customers/customers.module";
import { IssuesModule } from "./modules/issues/issues.module";
import { RechargesModule } from "./modules/recharges/recharges.module";
import { LoadShareModule } from "./modules/loadshare/loadshare.module";
import { CustomerStatusScheduler } from "./schedulers/customer-status.scheduler";
import { OtherClientsModule } from "./modules/other-clients/other-clients.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { NotificationModule } from "./modules/notifications/notifications.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { OperatorModule } from "./modules/operator/operator.module"; // ✅ Added Operator module
import { MailerModule } from "./mailers/mailer.modules";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    CustomersModule,
    IssuesModule,
    OtherClientsModule,
    LoadShareModule,
    ReportsModule,
    RechargesModule,
    DashboardModule,
    AuditModule,
    NotificationModule,
    AuthModule,
    MailerModule,
    OperatorModule, // ✅ Register OperatorModule
  ],

  providers: [
    PrismaService,
    CustomerStatusScheduler, // ✅ Scheduler stays registered
  ],
})
export class AppModule {}
