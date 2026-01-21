import { PartialType } from "@nestjs/mapped-types";
import { CreateOtherClientSiteDto } from "./create-other-client.dto";

export class UpdateOtherClientSiteDto extends PartialType(CreateOtherClientSiteDto) {}

// Keep backward compatibility alias
export { UpdateOtherClientSiteDto as UpdateOtherClientDto };
