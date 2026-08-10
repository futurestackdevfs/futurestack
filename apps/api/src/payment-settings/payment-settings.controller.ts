import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { PaymentSettingsService } from './payment-settings.service';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';

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
  @Patch('admin/payment-settings')
  update(@Body() dto: UpdatePaymentSettingsDto) {
    return this.paymentSettingsService.updateSettings(dto);
  }

  /** Public — no auth, consumed by the cart/checkout page currency selector. */
  @Get('payment-settings/public')
  getPublic() {
    return this.paymentSettingsService.getPublicSettings();
  }
}
