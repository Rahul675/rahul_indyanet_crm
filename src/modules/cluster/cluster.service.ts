import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateClusterDto } from "./dto/create-cluster.dto";
import { UpdateClusterDto } from "./dto/update-cluster.dto";

@Injectable()
export class ClusterService {
  constructor(private readonly prisma: PrismaService) {}

  // ✅ Create cluster
  async create(dto: CreateClusterDto) {
    return this.prisma.cluster.create({
      data: {
        name: dto.name,
        status: dto.status ?? "Active",
        assignedOperators: dto.assignedOperators ?? [],
      },
    });
  }

  // ✅ Get all clusters
  async findAll(user: any) {
    const isAdmin = (user?.role || "").toLowerCase() === "admin";

    return this.prisma.cluster.findMany({
      where: isAdmin ? {} : { assignedOperators: { has: user?.id } },
      orderBy: { createdAt: "desc" },
      include: {
        loadshares: true,
      },
    });
  }

  // ✅ Get single cluster with loadshares
  async findOne(id: string) {
    const cluster = await this.prisma.cluster.findUnique({
      where: { id },
      include: {
        loadshares: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!cluster) {
      throw new NotFoundException("Cluster not found");
    }

    return cluster;
  }

  // ✅ Update cluster
  async update(id: string, dto: UpdateClusterDto) {
    await this.findOne(id);

    return this.prisma.cluster.update({
      where: { id },
      data: {
        ...dto,
      },
    });
  }

  // ✅ Delete cluster
  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.cluster.delete({
      where: { id },
    });
  }
}
