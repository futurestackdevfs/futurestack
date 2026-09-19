import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';

@Injectable()
export class PaymentSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the singleton PaymentSettings row, creating it with the launch
   * defaults (INR on, USD off) on first access if the seed hasn't run yet.
   */
  /** Converts the Decimal-typed rate/percent columns to plain numbers right
   *  at the DB read boundary, so every downstream consumer (checkout, cart,
   *  invoices, admin) keeps doing plain-number arithmetic unchanged. */
  private toPlainSettings<T extends {
    gstPercent: { toNumber(): number };
    gstPercentUsd: { toNumber(): number };
    usdRate: { toNumber(): number };
  }>(settings: T) {
    return {
      ...settings,
      gstPercent: settings.gstPercent.toNumber(),
      gstPercentUsd: settings.gstPercentUsd.toNumber(),
      usdRate: settings.usdRate.toNumber(),
    };
  }

  async getSettings() {
    const settings = await this.prisma.paymentSettings.findFirst();
    if (settings) return this.toPlainSettings(settings);
    const created = await this.prisma.paymentSettings.create({
      data: {
        domesticEnabled: true,
        internationalEnabled: false,
        gstPercent: 18,
        gstPercentUsd: 0,
        // usdRate omitted — takes the schema @default. Admin edits it afterwards
        // in Payment Settings → Fees & Tax.
      },
    });
    return this.toPlainSettings(created);
  }

  /** Public projection — safe to expose to unauthenticated checkout pages. */
  async getPublicSettings() {
    const s = await this.getSettings();
    return {
      domesticEnabled: s.domesticEnabled,
      internationalEnabled: s.internationalEnabled,
      gstPercent: s.gstPercent,
      gstPercentUsd: s.gstPercentUsd,
    };
  }

  async updateSettings(dto: UpdatePaymentSettingsDto) {
    const settings = await this.getSettings();
    const next = {
      domesticEnabled: dto.domesticEnabled ?? settings.domesticEnabled,
      internationalEnabled:
        dto.internationalEnabled ?? settings.internationalEnabled,
      trainerSharePercent:
        dto.trainerSharePercent ?? settings.trainerSharePercent,
      gstPercent: dto.gstPercent ?? settings.gstPercent,
      gstPercentUsd: dto.gstPercentUsd ?? settings.gstPercentUsd,
      usdRate: dto.usdRate ?? settings.usdRate,
    };
    if (!next.domesticEnabled && !next.internationalEnabled) {
      throw new BadRequestException(
        'At least one payment method must remain enabled',
      );
    }
    const updated = await this.prisma.paymentSettings.update({
      where: { id: settings.id },
      data: next,
    });
    return this.toPlainSettings(updated);
  }
}
