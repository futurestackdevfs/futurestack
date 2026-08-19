import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SalesService } from './sales.service';
import { CreatePublicLeadDto } from './dto/create-public-lead.dto';

@Controller('public-leads')
export class PublicLeadsController {
  constructor(private readonly salesService: SalesService) {}

  /* Public — submitted from the free career guidance form on the student site.
     No auth: anyone can request a callback. Rate-limited. Creates an
     unassigned Lead (salespersonId: null) so only ADMIN sees it in My Leads
     until someone assigns it to a salesperson. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  create(@Body() dto: CreatePublicLeadDto) {
    return this.salesService.createPublicLead(dto);
  }
}