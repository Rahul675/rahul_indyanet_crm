import { ApiProperty } from "@nestjs/swagger";

export class ClusterEntity {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  createdAt!: Date;
}
