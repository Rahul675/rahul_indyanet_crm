import { Module } from "@nestjs/common";
import { CustomersService } from "./customers.service";
import { CustomersController } from "./customers.controller";
import { PrismaModule } from "../../prisma/prisma.module"; // ✅ use module, not service
import { NotificationModule } from "../notifications/notifications.module"; // ✅ import

@Module({
  imports: [PrismaModule, NotificationModule], // ✅ add
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
