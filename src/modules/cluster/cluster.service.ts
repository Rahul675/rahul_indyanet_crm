import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateClusterDto } from "./dto/create-cluster.dto";
import { UpdateClusterDto } from "./dto/update-cluster.dto";
import * as XLSX from "xlsx";

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

  // ✅ Export clusters to Excel
  async exportExcel() {
    const clusters = await this.prisma.cluster.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        loadshares: true,
      },
    });

    const excelRows = clusters.map((c) => ({
      Name: c.name,
      Status: c.status,
      "Assigned Operators": (c.assignedOperators || []).join(", "),
      "Loadshares Count": (c.loadshares || []).length,
      "Created At": c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clusters");
    return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
  }

  // ✅ Import clusters from Excel
  async importExcel(buffer: Buffer) {
    try {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new BadRequestException("Excel file has no sheets");
      }

      const sheet = workbook.Sheets[sheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      console.log("📊 Excel import started");
      console.log("📋 Total rows found:", rawRows.length);
      console.log("📝 First few rows:", JSON.stringify(rawRows.slice(0, 3)));
      console.log("📑 Column headers:", Object.keys(rawRows[0] || {}));

      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      for (const row of rawRows) {
        const getVal = (possibleKeys: string[]) => {
          // Try exact matches first
          for (const key of possibleKeys) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== "") 
              return row[key];
          }
          // Try case-insensitive and space-insensitive match
          const cleanedKeys = Object.keys(row);
          for (const k of cleanedKeys) {
            const standardK = k.replace(/[\n\r\s]/g, "").toUpperCase();
            for (const p of possibleKeys) {
              if (standardK === p.replace(/[\n\r\s]/g, "").toUpperCase())
                return row[k];
            }
          }
          return "";
        };

        const nameVal = String(getVal(["Name", "NAME", "name", "cluster name", "Cluster Name"]) || "").trim();
        
        if (!nameVal) {
          console.log("⏭️  Skipping row - no cluster name:", row);
          skippedCount++;
          continue;
        }

        const statusVal = String(getVal(["Status", "STATUS", "status"]) || "Active").trim();
        const operatorsVal = String(getVal(["Assigned Operators", "ASSIGNED OPERATORS", "Operators", "assignedOperators"]) || "").trim();
        
        // Parse assigned operators (comma-separated string to array)
        const assignedOperators = operatorsVal
          ? operatorsVal.split(",").map((op) => op.trim()).filter((op) => op !== "")
          : [];

        console.log(`📌 Processing cluster: ${nameVal}, Status: ${statusVal}`);

        // Check if cluster already exists
        const existing = await this.prisma.cluster.findFirst({
          where: { name: nameVal },
        });

        if (existing) {
          // Update existing cluster
          await this.prisma.cluster.update({
            where: { id: existing.id },
            data: {
              status: statusVal,
              assignedOperators,
              updatedAt: new Date(),
            },
          });
          console.log(`✏️  Updated cluster: ${nameVal}`);
          updatedCount++;
        } else {
          // Create new cluster
          await this.prisma.cluster.create({
            data: {
              name: nameVal,
              status: statusVal,
              assignedOperators,
            },
          });
          console.log(`✅ Created cluster: ${nameVal}`);
          createdCount++;
        }
      }

      console.log(`📊 Import complete - Created: ${createdCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}`);
      return { success: true, imported: createdCount, updated: updatedCount, skipped: skippedCount };
    } catch (error) {
      console.error("❌ Excel import error:", error);
      if (error instanceof Error) {
        throw new BadRequestException(`Import failed: ${error.message}`);
      }
      throw new BadRequestException("Import failed due to an unknown error.");
    }
  }
}
