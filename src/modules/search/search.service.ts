import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(q: string) {
    const term = (q || "").trim();
    if (!term) throw new NotFoundException("Query is empty");

    // Try exact match first (normalized)
    const exact = await this.prisma.loadShare.findFirst({
      where: {
        OR: [
          { rtNumber: term },
          { wifiOrNumber: term },
        ],
      },
      select: {
        id: true,
        rtNumber: true,
        wifiOrNumber: true,
        clusterId: true,
      },
    });

    if (exact) {
      return { type: "loadshare", data: exact };
    }

    // Fallback: partial, case-insensitive contains on both fields
    const partial = await this.prisma.loadShare.findFirst({
      where: {
        OR: [
          { rtNumber: { contains: term, mode: "insensitive" } },
          { wifiOrNumber: { contains: term, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        rtNumber: true,
        wifiOrNumber: true,
        clusterId: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!partial) {
      throw new NotFoundException("No RT number / WiFi number found");
    }

    return { type: "loadshare", data: partial };
  }
}
