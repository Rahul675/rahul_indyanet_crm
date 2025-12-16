import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { SearchService } from "./search.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async globalSearch(@Query("q") q: string) {
    if (!q) {
      return { message: "Query is required" };
    }

    return this.searchService.search(q);
  }
}
