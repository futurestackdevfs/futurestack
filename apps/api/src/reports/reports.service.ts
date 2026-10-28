import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseRange } from './report-range.util';
import {
  Report,
  ReportCurrency,
  ReportType,
  REPORT_TYPES,
} from './report.types';
import { buildRevenueReport } from './revenue.report';
import { buildEnrollmentsReport } from './enrollments.report';
import { buildTrainersReport } from './trainers.report';
import { buildSalesReport } from './sales.report';
import { buildRefundsReport } from './refunds.report';
import { buildSupportReport } from './support.report';
import { buildStaffReport } from './staff.report';

export interface ReportQuery {
  from?: string;
  to?: string;
  currency?: string;
}

/** What the console lists on its report picker. */
export const REPORT_CATALOG: {
  type: ReportType;
  title: string;
  icon: string;
  description: string;
  currency: boolean;
}[] = [
  {
    type: 'revenue',
    title: 'Revenue',
    icon: '💵',
    description: 'Collected, refunded, GST and discounts',
    currency: true,
  },
  {
    type: 'enrollments',
    title: 'Enrollments & courses',
    icon: '🎓',
    description: 'Signups, purchases and course performance',
    currency: false,
  },
  {
    type: 'refunds',
    title: 'Refunds',
    icon: '💸',
    description: 'Amounts, reasons and turnaround',
    currency: true,
  },
  {
    type: 'trainers',
    title: 'Trainers',
    icon: '🧑‍🏫',
    description: 'Earnings, payouts and ratings',
    currency: false,
  },
  {
    type: 'sales',
    title: 'Sales & leads',
    icon: '📞',
    description: 'Leads, conversion and targets',
    currency: true,
  },
  {
    type: 'support',
    title: 'Support & escalations',
    icon: '🎧',
    description: 'Response times and escalations',
    currency: false,
  },
  {
    type: 'staff',
    title: 'Staff activity',
    icon: '🗂',
    description: 'What each team member changed',
    currency: false,
  },
];

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  catalog() {
    return REPORT_CATALOG;
  }

  async run(type: string, query: ReportQuery): Promise<Report> {
    if (!(REPORT_TYPES as readonly string[]).includes(type)) {
      throw new BadRequestException(`Unknown report "${type}".`);
    }
    const range = parseRange(query.from, query.to);
    const currency: ReportCurrency = query.currency === 'USD' ? 'USD' : 'INR';

    switch (type as ReportType) {
      case 'revenue':
        return buildRevenueReport(this.prisma, range, currency);
      case 'enrollments':
        return buildEnrollmentsReport(this.prisma, range);
      case 'trainers':
        return buildTrainersReport(this.prisma, range);
      case 'sales':
        return buildSalesReport(this.prisma, range, currency);
      case 'refunds':
        return buildRefundsReport(this.prisma, range, currency);
      case 'support':
        return buildSupportReport(this.prisma, range);
      case 'staff':
        return buildStaffReport(this.prisma, range);
    }
  }
}
