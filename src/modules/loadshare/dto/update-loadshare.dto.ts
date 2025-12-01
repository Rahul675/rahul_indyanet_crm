import { PartialType } from "@nestjs/mapped-types";
import { CreateLoadShareDto } from "./create-loadshare.dto";

export class UpdateLoadShareDto extends PartialType(CreateLoadShareDto) {}
