import { PartialType } from "@nestjs/mapped-types";
import { CreateOtherClientGroupDto } from "./create-other-client-group.dto";

export class UpdateOtherClientGroupDto extends PartialType(CreateOtherClientGroupDto) {}
