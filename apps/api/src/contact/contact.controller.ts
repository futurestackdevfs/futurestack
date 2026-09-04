import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ContactService } from './contact.service';
import { RndInquiryDto } from './dto/rnd-inquiry.dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  // Public — "Have an R&D problem worth solving?" form on /research-and-development.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('rnd-inquiry')
  sendRndInquiry(@Body() dto: RndInquiryDto) {
    return this.contact.sendRndInquiry(dto);
  }
}
