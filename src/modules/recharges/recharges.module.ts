import { Module } from "@nestjs/common";
import { RechargesService } from "./recharges.service";
import { RechargesController } from "./recharges.controller";
import { PrismaModule } from "../../prisma/prisma.module";
import { NotificationModule } from "../notifications/notifications.module"; // ✅ import

@Module({
  imports: [PrismaModule, NotificationModule], // ✅ add
  controllers: [RechargesController],
  providers: [RechargesService],
})
export class RechargesModule {}
