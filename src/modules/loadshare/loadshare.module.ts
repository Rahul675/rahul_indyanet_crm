import { Module } from "@nestjs/common";
import { LoadShareService } from "./loadshare.service";
import { LoadShareController } from "./loadshare.controller";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  controllers: [LoadShareController],
  providers: [LoadShareService, PrismaService],
})
export class LoadShareModule {}
