import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Put,
} from "@nestjs/common";
import { OtherClientsService } from "./other-clients.service";
import { CreateOtherClientDto } from "./dto/create-other-client.dto";
import { UpdateOtherClientDto } from "./dto/update-other-client.dto";

@Controller("other-clients")
export class OtherClientsController {
  constructor(private readonly service: OtherClientsService) {}

  @Post()
  create(@Body() dto: CreateOtherClientDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query("search") search?: string) {
    return this.service.findAll(search);
  }

  @Get("export/json")
  export() {
    return this.service.exportJson();
  }

  @Post("import/json")
  importJson(@Body() body: any) {
    return this.service.importJson(body);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateOtherClientDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
