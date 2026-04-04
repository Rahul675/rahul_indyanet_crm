import { Module } from "@nestjs/common";
import { OtherClientsService } from "./other-clients.service";
import { OtherClientsController } from "./other-clients.controller";

@Module({
  controllers: [OtherClientsController],
  providers: [OtherClientsService],
})
export class OtherClientsModule {}
