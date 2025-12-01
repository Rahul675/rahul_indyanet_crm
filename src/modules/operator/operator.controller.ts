// import {
//   Controller,
//   Get,
//   Post,
//   Body,
//   Patch,
//   Param,
//   Delete,
//   Req,
//   UseGuards,
// } from "@nestjs/common";
// import { OperatorService } from "./operator.service";
// import { CreateOperatorDto } from "./dto/create-operator.dto";
// import { UpdateOperatorDto } from "./dto/update-operator.dto";
// import { JwtAuthGuard } from "../auth/jwt-auth.guard";

// @Controller("operators")
// @UseGuards(JwtAuthGuard) // ✅ Protect all routes with JWT
// export class OperatorController {
//   constructor(private readonly operatorService: OperatorService) {}

//   // ✅ Create operator (admin only)
//   @Post()
//   create(@Body() dto: CreateOperatorDto, @Req() req: any) {
//     return this.operatorService.create(dto, req.user);
//   }

//   // ✅ Get all operators
//   @Get()
//   findAll(@Req() req: any) {
//     return this.operatorService.findAll(req.user);
//   }

//   // ✅ Get single operator
//   @Get(":id")
//   findOne(@Param("id") id: string, @Req() req: any) {
//     return this.operatorService.findOne(id, req.user);
//   }

//   // ✅ Update operator (admin only)
//   @Patch(":id")
//   update(
//     @Param("id") id: string,
//     @Body() dto: UpdateOperatorDto,
//     @Req() req: any
//   ) {
//     return this.operatorService.update(id, dto, req.user);
//   }

//   // ✅ Delete operator (admin only)
//   @Delete(":id")
//   remove(@Param("id") id: string, @Req() req: any) {
//     return this.operatorService.remove(id, req.user);
//   }

//   // ✅ Assign operator to loadshare (admin only)
//   // @Post("assign/loadshare")
//   // assignLoadShare(@Req() req: any) {
//   //   const { operatorId, loadshareId } = req.body;
//   //   return this.operatorService.assignLoadShare(
//   //     operatorId,
//   //     loadshareId,
//   //     req.user
//   //   );
//   // }

//   // // ✅ Assign operator to issue (admin only)
//   // @Post("assign/issue")
//   // assignIssue(@Req() req: any) {
//   //   const { operatorId, issueId } = req.body;
//   //   return this.operatorService.assignIssue(operatorId, issueId, req.user);
//   // }
// }

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
} from "@nestjs/common";
import { OperatorService } from "./operator.service";
import { CreateOperatorDto } from "./dto/create-operator.dto";
import { UpdateOperatorDto } from "./dto/update-operator.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("operators")
@UseGuards(JwtAuthGuard)
export class OperatorController {
  constructor(private readonly operatorService: OperatorService) {}

  @Post()
  create(@Body() dto: CreateOperatorDto, @Req() req: any) {
    return this.operatorService.create(dto, req.user);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.operatorService.findAll(req.user);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @Req() req: any) {
    return this.operatorService.findOne(id, req.user);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateOperatorDto,
    @Req() req: any
  ) {
    return this.operatorService.update(id, dto, req.user);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: any) {
    return this.operatorService.remove(id, req.user);
  }
}
