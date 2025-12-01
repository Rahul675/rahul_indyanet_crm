import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateOtherClientDto } from "./dto/create-other-client.dto";
import { UpdateOtherClientDto } from "./dto/update-other-client.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class OtherClientsService {
  constructor(private prisma: PrismaService) {}

  // 🟢 Create
  async create(data: CreateOtherClientDto) {
    if (!data.site) throw new Error("Site is required");

    const payload = {
      ...data,
      date: data.date ? new Date(data.date) : null,
      installationDate: data.installationDate
        ? new Date(data.installationDate)
        : null,
    };

    return this.prisma.otherClient.create({ data: payload });
  }

  // 🟢 Get all or search
  async findAll(search?: string) {
    const where: Prisma.OtherClientWhereInput = search
      ? {
          OR: [
            { site: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { lanIp: { contains: search, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : {};

    const data = await this.prisma.otherClient.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return { success: true, count: data.length, data };
  }

  // 🟢 Get one by ID
  async findOne(id: string) {
    const record = await this.prisma.otherClient.findUnique({ where: { id } });
    if (!record) throw new NotFoundException("OtherClient record not found");
    return record;
  }

  // 🟢 Update
  async update(id: string, data: UpdateOtherClientDto) {
    await this.findOne(id);
    return this.prisma.otherClient.update({ where: { id }, data });
  }

  // 🟢 Delete
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.otherClient.delete({ where: { id } });
  }

  // 🟢 Import JSON array
  async importJson(records: CreateOtherClientDto[]) {
    const valid = records.filter((r) => r.site);
    const created = await this.prisma.otherClient.createMany({
      data: valid,
      skipDuplicates: true,
    });
    return { success: true, imported: created.count };
  }

  // 🟢 Export all as JSON
  async exportJson() {
    const data = await this.prisma.otherClient.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, count: data.length, data };
  }
}
