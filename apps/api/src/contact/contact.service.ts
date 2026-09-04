import { BadGatewayException, Injectable } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { RndInquiryDto } from './dto/rnd-inquiry.dto';

@Injectable()
export class ContactService {
  constructor(private readonly mail: MailService) {}

  async sendRndInquiry(dto: RndInquiryDto) {
    const sent = await this.mail.sendRndInquiryEmail({
      fromEmail: dto.email.trim(),
      details: dto.details?.trim(),
    });
    if (!sent) {
      throw new BadGatewayException(
        "Couldn't send your message right now — please try again in a moment.",
      );
    }
    return { sent: true };
  }
}
