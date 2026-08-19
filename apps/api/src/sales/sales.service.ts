import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { OrderStatus, Role, Currency, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentSettingsService } from '../payment-settings/payment-settings.service';
import {
  computeTrainerShare,
  resolveTrainerSharePercent,
} from '../payment-settings/share.util';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { CreatePublicLeadDto } from './dto/create-public-lead.dto';
import { MailService } from '../mail/mail.service';

type PipelineStatus = 'New' | 'Interested' | 'Converted' | 'Dropped';

export interface LeadRow {
  id: string;
  name: string;
  course: string;
  status: PipelineStatus;
  lastContact: string;
  budget: number;
  score: number;
  orderStatus: string;
  batchMode: string | null;
  salespersonId: string | null;
  createdAt: string;
}

/** Maps an order lifecycle to the sales pipeline buckets. */
function pipelineStatus(o: { status: OrderStatus }): PipelineStatus {
  switch (o.status) {
    case OrderStatus.PAID:
      return 'Converted';
    case OrderStatus.CREATED:
      return 'Interested';
    case OrderStatus.FAILED:
    case OrderStatus.CANCELLED:
    case OrderStatus.EXPIRED:
      return 'Dropped';
  }
}

/** Deterministic score per bucket so empty/real data both render sanely. */
function scoreFor(status: PipelineStatus): number {
  return status === 'Converted'
    ? 100
    : status === 'Interested'
      ? 65
      : status === 'New'
        ? 35
        : 10;
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const LEAD_INCLUDE = {
  salesperson: { select: { name: true, email: true } },
  student: { select: { name: true, email: true, phone: true, city: true } },
  order: {
    select: {
      id: true,
      totalAmount: true,
      status: true,
      paymentMethod: true,
      batchMode: true,
      createdAt: true,
      items: { select: { course: { select: { title: true, id: true } } } },
    },
  },
  followUps: { orderBy: { createdAt: 'desc' }, take: 20 },
} satisfies Prisma.LeadInclude;

type LeadWithInclude = Prisma.LeadGetPayload<{ include: typeof LEAD_INCLUDE }>;

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentSettings: PaymentSettingsService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  async getDashboard(userId: string, role: Role) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    /* Salespeople only see their own recorded sales. Self-bought orders (where
       the salesperson is also the student on the order) are always excluded,
       and other people's sales/courses never surface on a salesperson's dash. */
    const orderWhere: Prisma.OrderWhereInput = {};
    if (role !== Role.ADMIN) {
      orderWhere.salespersonId = userId;
      orderWhere.NOT = { userId };
    }

    const [orders, salesStaff] = await Promise.all([
      this.prisma.order.findMany({
        where: orderWhere,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: {
            include: { course: { select: { id: true, title: true } } },
          },
        },
      }),
      this.prisma.user.findMany({
        where: { role: Role.SALES },
        select: {
          id: true,
          name: true,
          email: true,
          companyId: true,
          isActive: true,
          _count: { select: { salesOrders: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    /* ── KPIs ── */
    const paid = orders.filter((o) => o.status === OrderStatus.PAID);
    const created = orders.filter((o) => o.status === OrderStatus.CREATED);

    const revenueMtd = this.round2(
      paid
        .filter((o) => o.createdAt >= monthStart)
        .reduce((s, o) => s + o.totalAmount, 0),
    );
    const prevRevenueMtd = this.round2(
      paid
        .filter(
          (o) => o.createdAt >= prevMonthStart && o.createdAt < monthStart,
        )
        .reduce((s, o) => s + o.totalAmount, 0),
    );
    const revenueMtdDelta =
      prevRevenueMtd > 0
        ? Math.round(((revenueMtd - prevRevenueMtd) / prevRevenueMtd) * 100)
        : 0;

    const pipelineNew = created.filter((o) => o.createdAt >= weekStart).length;
    const convertedWeek = paid.filter((o) => o.createdAt >= weekStart).length;

    const paidThisMonth = paid.filter((o) => o.createdAt >= monthStart).length;
    const paidPrevMonth = paid.filter(
      (o) => o.createdAt >= prevMonthStart && o.createdAt < monthStart,
    ).length;
    const thisMonthOrders = orders.filter(
      (o) => o.createdAt >= monthStart,
    ).length;
    const prevMonthOrders = orders.filter(
      (o) => o.createdAt >= prevMonthStart && o.createdAt < monthStart,
    ).length;
    const convRate =
      thisMonthOrders > 0
        ? Math.round((paidThisMonth / thisMonthOrders) * 100)
        : 0;
    const prevConvRate =
      prevMonthOrders > 0
        ? Math.round((paidPrevMonth / prevMonthOrders) * 100)
        : 0;
    const convDelta = convRate - prevConvRate;

    /* ── Revenue series (Online vs Offline) ── */
    const monthly = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const end = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: MONTH_LABELS[d.getMonth()],
        start: d,
        end,
        online: 0,
        offline: 0,
      };
    });
    const years = new Set<number>();
    for (const o of paid) {
      years.add(o.createdAt.getFullYear());
    }
    const yearly = Array.from(years)
      .sort()
      .map((y) => ({
        key: String(y),
        label: String(y),
        start: new Date(y, 0, 1),
        end: new Date(y + 1, 0, 1),
        online: 0,
        offline: 0,
      }));

    const bucketFor =
      (
        b: {
          key: string;
          label: string;
          start: Date;
          end: Date;
          online: number;
          offline: number;
        }[],
      ) =>
      (o: (typeof orders)[number]) => {
        const isOffline = (o.batchMode ?? 'Online') === 'Offline';
        for (const bkt of b) {
          if (o.createdAt >= bkt.start && o.createdAt < bkt.end) {
            if (isOffline) bkt.offline += o.totalAmount;
            else bkt.online += o.totalAmount;
            return;
          }
        }
      };
    for (const o of paid) {
      bucketFor(monthly)(o);
      bucketFor(yearly)(o);
    }

    const roundSeries = (
      b: {
        key: string;
        label: string;
        start: Date;
        end: Date;
        online: number;
        offline: number;
      }[],
    ) =>
      b.map((x) => ({
        ...x,
        online: this.round2(x.online),
        offline: this.round2(x.offline),
      }));
    const monthlySeries = roundSeries(monthly);
    const yearlySeries = roundSeries(yearly);

    const monthlyOnline = monthlySeries.reduce((s, x) => s + x.online, 0);
    const monthlyOffline = monthlySeries.reduce((s, x) => s + x.offline, 0);
    const yearlyOnline = yearlySeries.reduce((s, x) => s + x.online, 0);
    const yearlyOffline = yearlySeries.reduce((s, x) => s + x.offline, 0);

    /* ── Lead pipeline rows ── */
    const pipeline: LeadRow[] = orders.map((o) => {
      let status = pipelineStatus(o);
      // Fresh (≤7d) CREATED orders read as "New" — the classic top-of-funnel bucket.
      if (status === 'Interested' && o.createdAt >= weekStart) status = 'New';
      const firstItem = o.items[0];
      return {
        id: o.id,
        name: o.billingFullName ?? o.user?.name ?? 'Unknown',
        course: firstItem?.course.title ?? '—',
        status,
        lastContact: o.createdAt.toISOString().slice(0, 10),
        budget: o.totalAmount,
        score: scoreFor(status),
        orderStatus: o.status,
        batchMode: o.batchMode,
        salespersonId: o.salespersonId,
        createdAt: o.createdAt.toISOString(),
      };
    });

    const snapshot = {
      newLeads: pipeline.filter((p) => p.status === 'New').length,
      interested: pipeline.filter((p) => p.status === 'Interested').length,
      converted: pipeline.filter((p) => p.status === 'Converted').length,
      dropped: pipeline.filter((p) => p.status === 'Dropped').length,
    };

    /* ── Upcoming follow-ups (real lead data, not fake demos) ── */
    const followUps = await this.prisma.lead.findMany({
      where: {
        status: { notIn: ['Converted', 'Dropped'] },
        nextFollowUp: { gte: new Date() },
        ...(role !== Role.ADMIN ? { salespersonId: userId } : {}),
      },
      select: {
        id: true,
        name: true,
        course: true,
        nextFollowUp: true,
        salespersonId: true,
      },
      orderBy: { nextFollowUp: 'asc' },
      take: 8,
    });

    /* ── Sales staff (lead attribution, scoped to viewer) ── */
    const staff = salesStaff
      .filter((s) => role === Role.ADMIN || s.id === userId)
      .map((s) => {
        const myOrders = orders.filter((o) => o.salespersonId === s.id);
        const myValue = myOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        return {
          id: s.id,
          name: s.name,
          email: s.email,
          companyId: s.companyId,
          isActive: s.isActive,
          leadsCount: myOrders.length,
          totalValue: this.round2(myValue),
          avgValue:
            myOrders.length > 0 ? this.round2(myValue / myOrders.length) : 0,
        };
      });

    return {
      kpi: {
        revenueMtd,
        revenueMtdDelta,
        pipeline: created.length,
        pipelineNew,
        converted: paid.length,
        convertedWeek,
        demosScheduled: 0,
        callsMade: 0,
        convRate,
        convDelta,
      },
      revenue: {
        monthly: {
          labels: monthlySeries.map((x) => x.label),
          online: monthlySeries.map((x) => x.online),
          offline: monthlySeries.map((x) => x.offline),
          onlineTotal: monthlyOnline,
          offlineTotal: monthlyOffline,
          combined: monthlyOnline + monthlyOffline,
          onlineShare:
            monthlyOnline + monthlyOffline > 0
              ? Math.round(
                  (monthlyOnline / (monthlyOnline + monthlyOffline)) * 100,
                )
              : 0,
        },
        yearly: {
          labels: yearlySeries.map((x) => x.label),
          online: yearlySeries.map((x) => x.online),
          offline: yearlySeries.map((x) => x.offline),
          onlineTotal: yearlyOnline,
          offlineTotal: yearlyOffline,
          combined: yearlyOnline + yearlyOffline,
          onlineShare:
            yearlyOnline + yearlyOffline > 0
              ? Math.round(
                  (yearlyOnline / (yearlyOnline + yearlyOffline)) * 100,
                )
              : 0,
        },
      },
      pipeline,
      snapshot,
      staff,
      followUps: followUps.map((f) => ({
        id: f.id,
        name: f.name,
        course: f.course,
        nextFollowUp: f.nextFollowUp?.toISOString() ?? null,
        salespersonId: f.salespersonId,
      })),
      pipelineCount: orders.length,
      targetPct: convRate,
    };
  }

  async listCourses() {
    const [courses, settings] = await Promise.all([
      this.prisma.course.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, title: true, price: true, code: true },
        orderBy: { displayOrder: 'asc' },
      }),
      this.paymentSettings.getSettings(),
    ]);
    const gstPercent = settings.gstPercent ?? 18;
    return courses.map((c) => ({ ...c, gstPercent }));
  }

  async listStudents(search?: string) {
    return this.prisma.user.findMany({
      where: {
        role: Role.STUDENT,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: { id: true, name: true, email: true, phone: true, city: true },
      orderBy: { name: 'asc' },
      take: 50,
    });
  }

  /* ── Lead management (dynamic + editable "My Leads") ── */

  private toLeadRecord(lead: LeadWithInclude) {
    return {
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      city: lead.city,
      course: lead.course,
      status: lead.status,
      budget: lead.budget,
      score: lead.score,
      source: lead.source,
      notes: lead.notes,
      nextFollowUp: lead.nextFollowUp?.toISOString() ?? null,
      lastContact: lead.lastContact?.toISOString() ?? null,
      orderId: lead.orderId,
      studentId: lead.studentId,
      salespersonId: lead.salespersonId,
      salespersonName: lead.salesperson?.name ?? null,
      studentName: lead.student?.name ?? null,
      order: lead.order
        ? {
            id: lead.order.id,
            totalAmount: lead.order.totalAmount,
            status: lead.order.status,
            paymentMethod: lead.order.paymentMethod,
            batchMode: lead.order.batchMode,
            createdAt: lead.order.createdAt.toISOString(),
            course: lead.order.items[0]?.course.title ?? null,
          }
        : null,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
      followUps: lead.followUps.map((f) => ({
        id: f.id,
        action: f.action,
        note: f.note,
        scheduledAt: f.scheduledAt?.toISOString() ?? null,
        createdAt: f.createdAt.toISOString(),
      })),
    };
  }

  async listLeads(userId: string, role: Role, q?: string) {
    const where: Prisma.LeadWhereInput = {};
    const visibility: Prisma.LeadWhereInput[] = [];
    if (role !== Role.ADMIN) {
      visibility.push({
        OR: [{ salespersonId: userId }, { salespersonId: null }],
      });
    }
    if (q) {
      visibility.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
          { course: { contains: q, mode: 'insensitive' } },
        ],
      });
    }
    if (visibility.length) where.AND = visibility;
    const leads = await this.prisma.lead.findMany({
      where,
      include: LEAD_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return leads.map((l) => this.toLeadRecord(l));
  }

  async getLead(userId: string, role: Role, id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: LEAD_INCLUDE,
    });
    if (!lead) throw new NotFoundException('Lead not found');
    if (
      role !== Role.ADMIN &&
      lead.salespersonId !== userId &&
      lead.salespersonId !== null
    ) {
      throw new NotFoundException('Lead not found');
    }
    return this.toLeadRecord(lead);
  }

  async createLead(userId: string, dto: CreateLeadDto) {
    const status = dto.status ?? 'New';
    const score = dto.score ?? scoreFor(status);
    if (dto.email) {
      const dup = await this.prisma.lead.findFirst({
        where: { email: dto.email },
        select: { id: true },
      });
      if (dup)
        throw new ConflictException('A lead with this email already exists');
    }
    const lead = await this.prisma.lead.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        city: dto.city,
        course: dto.course,
        status,
        budget: dto.budget ?? 0,
        score,
        source: dto.source,
        notes: dto.notes,
        nextFollowUp: dto.nextFollowUp ? new Date(dto.nextFollowUp) : undefined,
        lastContact: dto.lastContact ? new Date(dto.lastContact) : undefined,
        salespersonId: userId,
        followUps: dto.nextFollowUp
          ? {
              create: [
                {
                  action: 'scheduled',
                  scheduledAt: new Date(dto.nextFollowUp),
                },
              ],
            }
          : undefined,
      },
      include: LEAD_INCLUDE,
    });
    return this.toLeadRecord(lead);
  }

  async updateLead(userId: string, role: Role, id: string, dto: UpdateLeadDto) {
    const existing = await this.prisma.lead.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Lead not found');
    if (
      role !== Role.ADMIN &&
      existing.salespersonId !== userId &&
      existing.salespersonId !== null
    ) {
      throw new NotFoundException('Lead not found');
    }
    if (dto.email && dto.email !== existing.email) {
      const dup = await this.prisma.lead.findFirst({
        where: { id: { not: id }, email: dto.email },
        select: { id: true },
      });
      if (dup)
        throw new ConflictException('A lead with this email already exists');
    }
    const data: Prisma.LeadUpdateInput = {};
    // Auto-claim: an unassigned lead becomes the editing salesperson's own the
    // moment they update it. Once claimed it stops appearing as "available".
    if (role !== Role.ADMIN && existing.salespersonId === null) {
      data.salesperson = { connect: { id: userId } };
    }
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.course !== undefined) data.course = dto.course;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.budget !== undefined) data.budget = dto.budget;
    if (dto.score !== undefined) data.score = dto.score;
    else if (dto.status !== undefined) data.score = scoreFor(dto.status);
    if (dto.source !== undefined) data.source = dto.source;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.nextFollowUp !== undefined)
      data.nextFollowUp = dto.nextFollowUp ? new Date(dto.nextFollowUp) : null;
    if (dto.lastContact !== undefined)
      data.lastContact = dto.lastContact ? new Date(dto.lastContact) : null;

    const followUpEntry: { action: string; scheduledAt: Date | null } | null =
      (() => {
        if (dto.nextFollowUp !== undefined) {
          const next = dto.nextFollowUp ? new Date(dto.nextFollowUp) : null;
          if (existing.nextFollowUp && !next) {
            return { action: 'completed', scheduledAt: existing.nextFollowUp };
          }
          if (
            next &&
            (!existing.nextFollowUp || +next !== +existing.nextFollowUp)
          ) {
            return {
              action: existing.nextFollowUp ? 'rescheduled' : 'scheduled',
              scheduledAt: next,
            };
          }
        }
        if (
          dto.status !== undefined &&
          dto.status !== existing.status &&
          (dto.status === 'Converted' || dto.status === 'Dropped')
        ) {
          return { action: dto.status.toLowerCase(), scheduledAt: null };
        }
        return null;
      })();

    let lead = await this.prisma.lead.update({
      where: { id },
      data,
      include: LEAD_INCLUDE,
    });
    if (followUpEntry) {
      await this.prisma.leadFollowUp.create({
        data: {
          leadId: id,
          action: followUpEntry.action,
          scheduledAt: followUpEntry.scheduledAt,
        },
      });
      lead = (await this.prisma.lead.findUnique({
        where: { id },
        include: LEAD_INCLUDE,
      }))!;
    }
    return this.toLeadRecord(lead);
  }

  async deleteLead(userId: string, role: Role, id: string) {
    const existing = await this.prisma.lead.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Lead not found');
    if (role !== Role.ADMIN && existing.salespersonId !== userId) {
      throw new NotFoundException('Lead not found');
    }
    await this.prisma.lead.delete({ where: { id } });
    return { deleted: true };
  }

  async createSale(salespersonId: string, dto: CreateSaleDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
      include: {
        trainer: { select: { id: true, trainerSharePercent: true } },
      },
    });
    if (!course || course.status !== 'ACTIVE') {
      throw new BadRequestException('Course is not available');
    }

    const discount = Math.max(0, Math.min(100, dto.discountPct));
    const price = course.price;
    const subtotal = price;
    const discountAmount = this.round2((subtotal * discount) / 100);
    const totalBeforeGst = this.round2(subtotal - discountAmount);

    const settings = await this.paymentSettings.getSettings();
    const gstPercent = settings.gstPercent ?? 18;
    const gstAmount = this.round2((totalBeforeGst * gstPercent) / 100);
    const totalAmount = this.round2(totalBeforeGst + gstAmount);

    if (totalAmount < 1) {
      throw new BadRequestException(
        'Sale total must be at least ₹1 — try a smaller discount',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let studentId: string;
      let studentEmail: string | null = null;
      let isNew = false;
      let tempPassword: string | null = null;

      if (dto.isNewStudent) {
        if (!dto.name || !dto.email) {
          throw new BadRequestException(
            'Name and email are required for a new student',
          );
        }
        const existing = await tx.user.findUnique({
          where: { email: dto.email },
        });
        if (existing) {
          throw new ConflictException(
            'A student with this email already exists',
          );
        }
        tempPassword = this.generateTempPassword();
        const user = await tx.user.create({
          data: {
            email: dto.email,
            name: dto.name,
            phone: dto.phone,
            city: dto.city,
            qualification: dto.qualification,
            password: await bcrypt.hash(tempPassword, 10),
            role: Role.STUDENT,
            emailVerified: true,
            mustChangePassword: true,
            passwordExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
          },
        });
        studentId = user.id;
        studentEmail = user.email;
        isNew = true;
      } else {
        if (!dto.studentId) {
          throw new BadRequestException('Choose a student');
        }
        const existingStudent = await tx.user.findUnique({
          where: { id: dto.studentId },
        });
        if (!existingStudent || existingStudent.role !== Role.STUDENT) {
          throw new BadRequestException('Student not found');
        }
        studentId = existingStudent.id;
        studentEmail = existingStudent.email;
      }

      const existingEnrollment = await tx.enrollment.findUnique({
        where: { studentId_courseId: { studentId, courseId: course.id } },
      });
      if (existingEnrollment) {
        throw new ConflictException(
          'This student is already enrolled in this course',
        );
      }

      const orderId = randomUUID();
      const order = await tx.order.create({
        data: {
          id: orderId,
          userId: studentId,
          currency: Currency.INR,
          gatewayType: 'DOMESTIC',
          subtotal,
          discountAmount,
          gstPercent,
          gstAmount,
          totalAmount,
          status: OrderStatus.CREATED,
          razorpayOrderId: `MANUAL-${orderId}`,
          paymentMethod: dto.paymentMethod,
          billingFullName: isNew ? dto.name : undefined,
          billingEmail: isNew ? dto.email : undefined,
          billingPhone: dto.phone,
          billingCity: dto.city,
          batchMode: dto.batchMode,
          discountReason: dto.discountReason,
          salespersonId,
        },
      });

      await tx.orderItem.create({
        data: {
          orderId: order.id,
          courseId: course.id,
          priceAtPurchase: price,
          currency: Currency.INR,
        },
      });

      /* Enrollment + revenue ledger are created only when payment is confirmed
         (see confirmPayment). Until then the order stays UNDER PROCESSING. */

      /* Auto-convert the linked lead → Converted, linked to this student + order */
      let leadConverted = false;
      if (dto.leadId) {
        const lead = await tx.lead.findUnique({ where: { id: dto.leadId } });
        if (!lead || lead.salespersonId !== salespersonId) {
          throw new BadRequestException(
            'Lead not found or does not belong to you',
          );
        }
        await tx.lead.update({
          where: { id: lead.id },
          data: {
            studentId,
            orderId: order.id,
            status: 'Converted',
            score: 100,
            lastContact: new Date(),
            nextFollowUp: null,
          },
        });
        await tx.leadFollowUp.create({
          data: { leadId: lead.id, action: 'converted', scheduledAt: null },
        });
        leadConverted = true;
      }

      const studentName = isNew
        ? dto.name
        : (
            await tx.user.findUnique({
              where: { id: studentId },
              select: { name: true },
            })
          )?.name;

      return {
        orderId: order.id,
        status: 'processing' as const,
        studentEmail,
        studentName,
        courseName: course.title,
        courseSlug: this.slugify(course.title),
        batchMode: dto.batchMode,
        finalAmt: totalAmount,
        leadConverted,
        isNewStudent: isNew,
        tempPassword,
      };
    });

    let emailSent = false;
    if (dto.sendEmail && result.studentEmail) {
      await this.mailService.sendSaleProcessingEmail(result.studentEmail, {
        studentName: result.studentName ?? 'Student',
        courseName: result.courseName,
        courseLink: `${this.frontendUrl}/courses/${result.courseSlug}`,
        finalAmt: result.finalAmt,
        batchMode: result.batchMode,
        isNewStudent: result.isNewStudent,
        loginEmail: result.studentEmail,
        tempPassword: result.tempPassword,
      });
      emailSent = true;
    }

    return { ...result, emailSent };
  }

  /* ── Pending payments (UNDER PROCESSING orders) ── */

  async listPendingOrders(userId: string, role: Role) {
    const where: Prisma.OrderWhereInput = {
      status: OrderStatus.CREATED,
      razorpayOrderId: { startsWith: 'MANUAL-' },
    };
    if (role !== Role.ADMIN) where.salespersonId = userId;
    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { select: { course: { select: { id: true, title: true } } } },
      },
    });
    return orders.map((o) => ({
      id: o.id,
      studentId: o.userId,
      studentName: o.user?.name ?? null,
      studentEmail: o.user?.email ?? null,
      course: o.items[0]?.course.title ?? null,
      totalAmount: o.totalAmount,
      batchMode: o.batchMode,
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt.toISOString(),
    }));
  }

  /**
   * Marks a pending manual order as PAID: creates the enrollment + revenue
   * ledger (deferred from createSale), finalizes the receipt, and emails it.
   */
  async confirmPayment(
    userId: string,
    role: Role,
    orderId: string,
    paymentMethod?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { name: true, email: true } },
        items: {
          include: {
            course: {
              include: {
                trainer: { select: { id: true, trainerSharePercent: true } },
              },
            },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (role !== Role.ADMIN && order.salespersonId !== userId) {
      throw new NotFoundException('Order not found');
    }
    if (order.status !== OrderStatus.CREATED) {
      throw new BadRequestException('Order is not pending payment');
    }
    const course = order.items[0]?.course;
    if (!course) throw new BadRequestException('Order has no course');

    const result = await this.prisma.$transaction(async (tx) => {
      const existingEnrollment = await tx.enrollment.findUnique({
        where: {
          studentId_courseId: { studentId: order.userId, courseId: course.id },
        },
      });
      if (existingEnrollment) {
        throw new ConflictException(
          'This student is already enrolled in this course',
        );
      }

      const enrollment = await tx.enrollment.create({
        data: {
          studentId: order.userId,
          courseId: course.id,
          amountPaid: order.totalAmount,
          orderId: order.id,
          status: 'active',
        },
      });

      if (course.trainer) {
        const settings = await this.paymentSettings.getSettings();
        const sharePct = resolveTrainerSharePercent(
          course.trainer.trainerSharePercent,
          settings.trainerSharePercent,
        );
        const { trainerShare, platformCut } = computeTrainerShare(
          order.totalAmount,
          sharePct,
        );
        await tx.revenueLedger.create({
          data: {
            trainerId: course.trainer.id,
            enrollmentId: enrollment.id,
            gross: order.totalAmount,
            platformCut,
            trainerShare,
          },
        });
      }

      const effectiveMethod = paymentMethod ?? order.paymentMethod;
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PAID,
          paymentMethod: effectiveMethod,
        },
      });

      const receipt = {
        receiptNo: `FS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${order.id.slice(0, 6).toUpperCase()}`,
        studentName: order.user?.name ?? 'Student',
        studentEmail: order.user?.email ?? null,
        courseName: course.title,
        price: order.subtotal,
        discountPct:
          order.subtotal > 0
            ? Math.round((order.discountAmount / order.subtotal) * 100)
            : 0,
        discAmt: order.discountAmount,
        gstPercent: order.gstPercent,
        gstAmount: order.gstAmount,
        finalAmt: order.totalAmount,
        batchMode: order.batchMode,
        paymentMethod: effectiveMethod,
        date: new Date().toISOString(),
        isNewStudent: false,
        generatedPassword: null,
      };
      return { receipt, courseTitle: course.title };
    });

    if (order.user?.email) {
      await this.mailService.sendSaleConfirmedEmail(order.user.email, {
        studentName: result.receipt.studentName,
        courseName: result.receipt.courseName,
        courseLink: `${this.frontendUrl}/courses/${this.slugify(result.courseTitle)}`,
        finalAmt: result.receipt.finalAmt,
        receiptNo: result.receipt.receiptNo,
        paymentMethod: result.receipt.paymentMethod ?? 'Other',
        batchMode: result.receipt.batchMode ?? 'Online',
      });
    }

    return result.receipt;
  }

  private get frontendUrl(): string {
    return (
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000'
    );
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private generateTempPassword(): string {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    return password;
  }

  /* ── Public career-guidance leads ── */

  async createPublicLead(dto: CreatePublicLeadDto) {
    return this.prisma.lead.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        city: dto.city,
        course: dto.course,
        source: dto.source ?? 'career_guidance',
        status: 'New',
        budget: 0,
        score: scoreFor('New'),
        salespersonId: null,
      },
    });
  }
}
