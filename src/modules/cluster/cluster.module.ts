import { Module } from "@nestjs/common";
import { ClusterService } from "./cluster.service";
import { ClusterController } from "./cluster.controller";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [ClusterController],
  providers: [ClusterService],
})
export class ClusterModule {}
