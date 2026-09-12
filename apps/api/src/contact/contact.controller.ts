import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ContactService } from './contact.service';
import { RndInquiryDto } from './dto/rnd-inquiry.dto';
import { ContactMessageDto } from './dto/contact-message.dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  // Public — "Have an R&D problem worth solving?" form on /research-and-development.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('rnd-inquiry')
  @HttpCode(202)
  sendRndInquiry(@Body() dto: RndInquiryDto) {
    return this.contact.sendRndInquiry(dto);
  }

  // Public — general "Contact us" form (business / trainer / other inquiries).
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('message')
  @HttpCode(202)
  submitContact(@Body() dto: ContactMessageDto) {
    return this.contact.submitContact(dto);
  }
}
