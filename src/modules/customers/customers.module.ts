import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { CustomersService } from "./customers.service";
import { CustomersController } from "./customers.controller";
import { PrismaModule } from "../../prisma/prisma.module";
import { NotificationModule } from "../notifications/notifications.module";

@Module({
  imports: [
    PrismaModule,
    NotificationModule,
    MulterModule.register({
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    }),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
