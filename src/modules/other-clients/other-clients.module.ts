import { Module } from "@nestjs/common";
import { OtherClientsService } from "./other-clients.service";
import { OtherClientsController } from "./other-clients.controller";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  controllers: [OtherClientsController],
  providers: [OtherClientsService, PrismaService],
})
export class OtherClientsModule {}
