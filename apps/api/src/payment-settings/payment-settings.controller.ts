import { Body, Controller, Get, Header, Patch } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { PaymentSettingsService } from './payment-settings.service';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';
import { Audit } from '../audit/audit.decorator';

@Controller()
export class PaymentSettingsController {
  constructor(
    private readonly paymentSettingsService: PaymentSettingsService,
  ) {}

  @Auth(Role.ADMIN)
  @Get('admin/payment-settings')
  get() {
    return this.paymentSettingsService.getSettings();
  }

  @Auth(Role.ADMIN)
  @Audit({ action: 'UPDATE', entity: 'PaymentSettings', idFrom: 'none' })
  @Patch('admin/payment-settings')
  update(@Body() dto: UpdatePaymentSettingsDto) {
    return this.paymentSettingsService.updateSettings(dto);
  }

  /** Public — no auth, consumed by the cart/checkout page currency selector. */
  @Header('Cache-Control', 'public, max-age=120, s-maxage=600, stale-while-revalidate=600')
  @Get('payment-settings/public')
  getPublic() {
    return this.paymentSettingsService.getPublicSettings();
  }
}
