import { Module } from "@nestjs/common";
import { LoadShareService } from "./loadshare.service";
import { LoadShareController } from "./loadshare.controller";

@Module({
  controllers: [LoadShareController],
  providers: [LoadShareService],
})
export class LoadShareModule {}
