import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { CustomersService } from "./customers.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { CustomerEntity } from "./entities/customer.entity";

@ApiTags("Customers")
@Controller("customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: "Create a new customer" })
  @ApiResponse({ status: 201, type: CustomerEntity })
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all customers" })
  @ApiResponse({ status: 200, type: [CustomerEntity] })
  findAll() {
    return this.customersService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a specific customer by ID" })
  @ApiResponse({ status: 200, type: CustomerEntity })
  findOne(@Param("id") id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a customer by ID" })
  update(
    @Param("id") id: string,
    @Body() updateCustomerDto: UpdateCustomerDto
  ) {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a customer by ID" })
  remove(@Param("id") id: string) {
    return this.customersService.remove(id);
  }
}
