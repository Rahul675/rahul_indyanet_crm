import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(q: string) {
    // 🔍 search by wifiOrNumber OR RT number
    const loadshare = await this.prisma.loadShare.findFirst({
      where: {
        OR: [{ wifiOrNumber: q }, { rtNumber: q }],
      },
      select: {
        id: true,
        rtNumber: true,
        wifiOrNumber: true,
        clusterId: true,
      },
    });

    if (!loadshare) {
      throw new NotFoundException("No LoadShare found");
    }

    return {
      type: "loadshare",
      data: loadshare,
    };
  }
}
