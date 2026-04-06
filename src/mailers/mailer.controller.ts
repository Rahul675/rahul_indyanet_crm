import { Controller, Get, Query } from "@nestjs/common";
import { MailerService } from "./mailer.services";

@Controller("mail")
export class MailerController {
  constructor(private readonly mailerService: MailerService) {}

  @Get("health")
  async health(@Query("live") live?: string) {
    return this.mailerService.getHealth({ live: live === "true" });
  }
}
