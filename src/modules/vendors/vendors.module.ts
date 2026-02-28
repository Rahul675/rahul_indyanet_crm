import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { PrismaModule } from "../../prisma/prisma.module";
import { NotificationModule } from "../notifications/notifications.module";
import { VendorsController } from "./vendors.controller";
import { VendorsService } from "./vendors.service";

@Module({
  imports: [
    PrismaModule,
    NotificationModule,
    MulterModule.register({
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  ],
  controllers: [VendorsController],
  providers: [VendorsService],
})
export class VendorsModule {}
