import { PartialType } from "@nestjs/mapped-types";
import { CreateOtherClientDto } from "./create-other-client.dto";

export class UpdateOtherClientDto extends PartialType(CreateOtherClientDto) {}
