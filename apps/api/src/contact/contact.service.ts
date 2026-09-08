import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { RndInquiryDto } from './dto/rnd-inquiry.dto';
import { ContactMessageDto } from './dto/contact-message.dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private readonly mail: MailService) {}

  // The visitor doesn't need to wait for the AgentMail round-trip (~1s) — it
  // only notifies staff. Kick the send off in the background and return right
  // away; MailService already logs failures internally.
  private fireAndForget(label: string, send: Promise<unknown>) {
    void send.catch((err) => {
      this.logger.error(`Background ${label} send failed`, err);
    });
  }

  sendRndInquiry(dto: RndInquiryDto) {
    this.fireAndForget(
      'R&D inquiry',
      this.mail.sendRndInquiryEmail({
        fromEmail: dto.email.trim(),
        details: dto.details?.trim(),
      }),
    );
    return { queued: true };
  }

  submitContact(dto: ContactMessageDto) {
    this.fireAndForget(
      'contact',
      this.mail.sendContactEmail({
        name: dto.name.trim(),
        email: dto.email.trim(),
        phone: dto.phone?.trim() || undefined,
        type: dto.type,
        company: dto.company?.trim() || undefined,
        message: dto.message.trim(),
      }),
    );
    return { queued: true };
  }
}
