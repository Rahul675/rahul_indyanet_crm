// import {
//   Injectable,
//   NotFoundException,
//   ForbiddenException,
//   BadRequestException,
// } from "@nestjs/common";
// import { PrismaService } from "../../prisma/prisma.service";
// import { CreateOperatorDto } from "./dto/create-operator.dto";
// import { UpdateOperatorDto } from "./dto/update-operator.dto";
// import { MailerService } from "../../mailers/mailer.services"; // adjust path
// import * as bcrypt from "bcrypt";

// @Injectable()
// export class OperatorService {
//   constructor(private prisma: PrismaService) {}

//   // 🟢 Create Operator (Admin Only)
//   async create(dto: CreateOperatorDto, currentUser: any) {
//     if (currentUser.role !== "admin") {
//       throw new ForbiddenException("Only admins can create operators.");
//     }

//     if (!dto.name || !dto.email) {
//       throw new BadRequestException("Name and email are required.");
//     }

//     const hashedPassword = await bcrypt.hash(dto.password || "default123", 10);

//     const existing = await this.prisma.user.findUnique({
//       where: { email: dto.email },
//     });
//     if (existing) {
//       throw new BadRequestException(
//         "An operator with this email already exists."
//       );
//     }

//     const operator = await this.prisma.user.create({
//       data: {
//         name: dto.name,
//         email: dto.email,
//         password: hashedPassword,
//         role: "operator",
//       },
//     });

//     // 🟢 Send Email
//     await this.mailer.send(
//       operator.email,
//       "Your Operator Account Has Been Created",
//       `
//       <h3>Welcome, ${operator.name}!</h3>
//       <p>Your operator account has been created successfully.</p>
//       <p><strong>Email:</strong> ${operator.email}</p>
//       <p><strong>Password:</strong> ${dto.password || "default123"}</p>
//       <br/>
//       <p>Please login and change your password immediately.</p>
//     `
//     );

//     return {
//       message: "Operator created successfully",
//       operator: {
//         id: operator.id,
//         name: operator.name,
//         email: operator.email,
//         role: operator.role,
//       },
//     };
//   }

//   // 🟢 Get All Operators (Admins only can view full list)
//   async findAll(currentUser: any) {
//     if (currentUser.role !== "admin") {
//       throw new ForbiddenException("Only admins can view all operators.");
//     }

//     const operators = await this.prisma.user.findMany({
//       where: { role: "operator" },
//       select: {
//         id: true,
//         name: true,
//         email: true,
//         isOnline: true,
//         lastActiveAt: true,
//         createdAt: true,
//       },
//       orderBy: { createdAt: "desc" },
//     });

//     return { count: operators.length, operators };
//   }

//   // 🟢 Get Operator by ID
//   async findOne(id: string, currentUser: any) {
//     const operator = await this.prisma.user.findUnique({
//       where: { id },
//       // include: { loadshares: true, issues: true },
//     });

//     if (!operator || operator.role !== "operator") {
//       throw new NotFoundException("Operator not found.");
//     }

//     // 🧠 Allow admin or the operator themselves
//     if (currentUser.role !== "admin" && currentUser.id !== id) {
//       throw new ForbiddenException("Access denied.");
//     }

//     return operator;
//   }

//   // 🟢 Update Operator (Admin Only)
//   async update(id: string, dto: UpdateOperatorDto, currentUser: any) {
//     if (currentUser.role !== "admin") {
//       throw new ForbiddenException("Only admins can update operators.");
//     }

//     const existing = await this.findOne(id, currentUser);

//     return this.prisma.user.update({
//       where: { id: existing.id },
//       data: {
//         name: dto.name ?? existing.name,
//         email: dto.email ?? existing.email,
//         isOnline: dto.isOnline ?? existing.isOnline,
//       },
//     });
//   }

//   // 🟢 Delete Operator (Admin Only)
//   async remove(id: string, currentUser: any) {
//     if (currentUser.role !== "admin") {
//       throw new ForbiddenException("Only admins can delete operators.");
//     }

//     const existing = await this.findOne(id, currentUser);
//     await this.prisma.user.delete({ where: { id: existing.id } });

//     return { message: `Operator ${existing.name} removed successfully.` };
//   }

//   // 🟢 Assign Operator to LoadShare (Admin Only)
//   // async assignLoadShare(
//   //   operatorId: string,
//   //   loadshareId: string,
//   //   currentUser: any
//   // ) {
//   //   if (currentUser.role !== "admin") {
//   //     throw new ForbiddenException("Only admins can assign operators.");
//   //   }

//   //   await this.findOne(operatorId, currentUser);

//   //   return this.prisma.loadShare.update({
//   //     where: { id: loadshareId },
//   //     data: { operatorId },
//   //   });
//   // }

//   // // 🟢 Assign Operator to Issue (Admin Only)
//   // async assignIssue(operatorId: string, issueId: string, currentUser: any) {
//   //   if (currentUser.role !== "admin") {
//   //     throw new ForbiddenException("Only admins can assign operators.");
//   //   }

//   //   await this.findOne(operatorId, currentUser);

//   //   return this.prisma.issue.update({
//   //     where: { id: issueId },
//   //     data: { operatorId },
//   //   });
//   // }
// }

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateOperatorDto } from "./dto/create-operator.dto";
import { UpdateOperatorDto } from "./dto/update-operator.dto";
import { MailerService } from "../../mailers/mailer.services";
import { AuditService } from "../audit/audit.service";
import { NotificationService } from "../notifications/notification.service";
import * as bcrypt from "bcrypt";

@Injectable()
export class OperatorService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationService,
    private mailer: MailerService
  ) {}

  private async getAssignedClusterIds(operatorId: string) {
    const clusters = await this.prisma.cluster.findMany({
      where: { assignedOperators: { has: operatorId } },
      select: { id: true },
    });

    return clusters.map((cluster) => cluster.id);
  }

  private async attachAssignedClusters<T extends { id: string }>(operator: T) {
    const assignedClusters = await this.getAssignedClusterIds(operator.id);
    return {
      ...operator,
      assignedClusters,
    };
  }

  private async syncAssignedClusters(operatorId: string, clusterIds: string[]) {
    const targetClusterIds = Array.from(new Set(clusterIds || []));

    const existingClusters = await this.prisma.cluster.findMany({
      where: { assignedOperators: { has: operatorId } },
      select: { id: true, assignedOperators: true },
    });

    const existingIds = new Set(existingClusters.map((cluster) => cluster.id));
    const targetIdSet = new Set(targetClusterIds);

    const requestedClusters = targetClusterIds.length
      ? await this.prisma.cluster.findMany({
          where: { id: { in: targetClusterIds } },
          select: { id: true, assignedOperators: true },
        })
      : [];

    if (requestedClusters.length !== targetClusterIds.length) {
      throw new BadRequestException("One or more selected clusters were not found.");
    }

    const clusterUpdates = [
      ...existingClusters
        .filter((cluster) => !targetIdSet.has(cluster.id))
        .map((cluster) =>
          this.prisma.cluster.update({
            where: { id: cluster.id },
            data: {
              assignedOperators: cluster.assignedOperators.filter(
                (id) => id !== operatorId
              ),
            },
          })
        ),
      ...requestedClusters
        .filter((cluster) => !existingIds.has(cluster.id))
        .map((cluster) =>
          this.prisma.cluster.update({
            where: { id: cluster.id },
            data: {
              assignedOperators: Array.from(
                new Set([...(cluster.assignedOperators || []), operatorId])
              ),
            },
          })
        ),
      ...requestedClusters
        .filter((cluster) => existingIds.has(cluster.id))
        .map((cluster) =>
          this.prisma.cluster.update({
            where: { id: cluster.id },
            data: {
              assignedOperators: Array.from(
                new Set([...(cluster.assignedOperators || []), operatorId])
              ),
            },
          })
        ),
    ];

    await this.prisma.$transaction(clusterUpdates);
  }

  // 🟢 Create Operator (Admin Only)
  async create(dto: CreateOperatorDto, currentUser: any) {
    if (currentUser.role !== "admin") {
      throw new ForbiddenException("Only admins can create operators.");
    }

    if (!dto.name || !dto.email) {
      throw new BadRequestException("Name and email are required.");
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new BadRequestException(
        "An operator with this email already exists."
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password || "default123", 10);

    const operator = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        role: "operator",
      },
    });

    if (dto.assignedClusters?.length) {
      await this.syncAssignedClusters(operator.id, dto.assignedClusters);
    }

    // 🟢 Audit Log
    await this.audit.logAction(
      currentUser.id,
      "CREATE_OPERATOR",
      "User",
      `Admin ${currentUser.name} created operator account: ${operator.name}`
    );

    // 🟢 Notification
    await this.notifications.createNotification(
      "New Operator Account Created",
      `${operator.name} has been added as a new operator.`,
      operator.id
    );

    // Send Email
    await this.mailer.send(
      operator.email,
      "Your Operator Account Has Been Created",
      `
        <h3>Welcome, ${operator.name}!</h3>
        <p>Your operator account has been created successfully.</p>
        <p><strong>Email:</strong> ${operator.email}</p>
        <p><strong>Password:</strong> ${dto.password || "default123"}</p>
        <br/>
        <p>Please login and change your password immediately.</p>
      `
    );

    return {
      success: true,
      data: {
        message: "Operator created successfully",
        operator: await this.attachAssignedClusters({
          id: operator.id,
          name: operator.name,
          email: operator.email,
          role: operator.role,
        }),
      },
    };
  }

  // 🟢 Get All Operators
  async findAll(currentUser: any) {
    if (currentUser.role !== "admin") {
      throw new ForbiddenException("Only admins can view operators.");
    }

    const operators = await this.prisma.user.findMany({
      where: { role: "operator" },
      select: {
        id: true,
        name: true,
        email: true,
        isOnline: true,
        lastActiveAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const operatorsWithClusters = await Promise.all(
      operators.map((operator) => this.attachAssignedClusters(operator))
    );

    return {
      success: true,
      count: operatorsWithClusters.length,
      data: operatorsWithClusters,
    };
  }

  // 🟢 Get Operator by ID
  async findOne(id: string, currentUser: any) {
    const operator = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!operator || operator.role !== "operator") {
      throw new NotFoundException("Operator not found.");
    }

    // Only admin or the same operator can view
    if (currentUser.role !== "admin" && currentUser.id !== id) {
      throw new ForbiddenException("Access denied.");
    }

    return this.attachAssignedClusters(operator);
  }

  // 🟢 Update Operator (Admin Only)
  async update(id: string, dto: UpdateOperatorDto, currentUser: any) {
    if (currentUser.role !== "admin") {
      throw new ForbiddenException("Only admins can update operators.");
    }

    const existing = await this.findOne(id, currentUser);

    const updated = await this.prisma.user.update({
      where: { id: existing.id },
      data: {
        name: dto.name ?? existing.name,
        email: dto.email ?? existing.email,
        isOnline: dto.isOnline ?? existing.isOnline,
      },
    });

    if (dto.assignedClusters !== undefined) {
      await this.syncAssignedClusters(updated.id, dto.assignedClusters);
    }

    return {
      success: true,
      data: {
        message: "Operator updated successfully",
        operator: await this.attachAssignedClusters(updated),
      },
    };
  }

  // 🟢 Delete Operator (Admin Only)
  async remove(id: string, currentUser: any) {
    if (currentUser.role !== "admin") {
      throw new ForbiddenException("Only admins can delete operators.");
    }

    const operator = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!operator || operator.role !== "operator") {
      throw new NotFoundException("Operator not found.");
    }

    await this.syncAssignedClusters(operator.id, []);

    await this.prisma.user.delete({ where: { id } });

    return {
      success: true,
      data: {
        message: `Operator ${operator.name} removed successfully.`,
      },
    };
  }
}
