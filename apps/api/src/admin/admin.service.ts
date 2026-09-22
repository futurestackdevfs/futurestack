import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { OrderStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UploadVideoDto } from './dto/upload-video.dto';
import { VdoCipherService } from '../vdocipher/vdocipher.service';
import { S3Service } from '../upload/s3.service';
import { TTLCache } from '../common/ttl-cache';
import { VdoCipherWebhookPayload } from './dto/vdocipher-webhook.dto';
import { UpdateTrainerShareDto } from './dto/update-trainer-share.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  // Staff analytics — a few seconds of staleness is fine and these run many
  // heavy aggregate queries. Serve stale + refresh in the background.
  private readonly analyticsCache = new TTLCache<any>(45_000);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vdoCipherService: VdoCipherService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
  ) {}

  // Reports which env vars are PRESENT for each third-party integration —
  // never their values. Only presence/absence booleans leave this method,
  // by design, so this endpoint can never leak credential material.
  getIntegrationsStatus() {
    const has = (name: string) => Boolean(this.configService.get<string>(name));

    const razorpayFields = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'].map((name) => ({
      name,
      present: has(name),
    }));
    const vdocipherFields = [{ name: 'VDOCIPHER_API_KEY', present: has('VDOCIPHER_API_KEY') }];
    const googleFields = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL'].map(
      (name) => ({ name, present: has(name) }),
    );
    const emailFields = ['AGENTMAIL_API_KEY', 'AGENTMAIL_INBOX_ID', 'CONTACT_EMAIL'].map((name) => ({
      name,
      present: has(name),
    }));

    return [
      {
        key: 'razorpay',
        label: 'Razorpay',
        configured: razorpayFields.every((f) => f.present),
        fields: razorpayFields,
        webhookConfigured: has('RAZORPAY_WEBHOOK_SECRET'),
        webhookRoute: '/webhooks/razorpay',
      },
      {
        key: 'vdocipher',
        label: 'VdoCipher',
        configured: vdocipherFields.every((f) => f.present),
        fields: vdocipherFields,
        webhookConfigured: has('VDOCIPHER_WEBHOOK_SECRET'),
        webhookRoute: '/admin/videos/vdocipher-webhook',
      },
      {
        key: 'storage',
        label: 'File Storage (S3 / Supabase)',
        configured: this.s3Service.isConfigured(),
        fields: [{ name: 'S3 / Supabase credentials', present: this.s3Service.isConfigured() }],
      },
      {
        key: 'google',
        label: 'Google OAuth',
        configured: googleFields.every((f) => f.present),
        fields: googleFields,
      },
      {
        key: 'email',
        label: 'AgentMail (Email)',
        configured: emailFields.every((f) => f.present),
        fields: emailFields,
      },
    ];
  }

  async listAllTrainers() {
    const trainers = await this.prisma.user.findMany({
      where: { role: Role.TRAINER },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        yearsExperience: true,
        rating: true,
        avatarUrl: true,
        approvalStatus: true,
        isActive: true,
        createdAt: true,
        _count: { select: { coursesTaught: true, enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return trainers.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      bio: t.bio,
      yearsExperience: t.yearsExperience,
      rating: t.rating,
      avatarUrl: t.avatarUrl,
      approvalStatus: t.approvalStatus ?? 'PENDING',
      isActive: t.isActive,
      createdAt: t.createdAt,
      coursesTaught: t._count.coursesTaught,
      totalStudents: t._count.enrollments,
    }));
  }

  async listPendingTrainers() {
    const trainers = await this.prisma.user.findMany({
      // Only show applications the trainer has actually submitted — one who
      // hasn't finished the onboarding form yet has nothing to review.
      where: {
        role: Role.TRAINER,
        approvalStatus: 'PENDING',
        profileSubmittedAt: { not: null },
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        bio: true,
        phone: true,
        dob: true,
        city: true,
        qualification: true,
        experience: true,
        careerPath: true,
        skills: true,
        yearsExperience: true,
        profileSubmittedAt: true,
        createdAt: true,
      },
      orderBy: { profileSubmittedAt: 'asc' }, // oldest applications first
    });

    return trainers.map((t) => ({
      ...t,
      dob: t.dob ? t.dob.toISOString().split('T')[0] : null,
    }));
  }

  async approveTrainer(trainerId: string) {
    const trainer = await this.findPendingTrainer(trainerId);

    const updated = await this.prisma.user.update({
      where: { id: trainer.id },
      data: { approvalStatus: 'APPROVED' },
    });

    return {
      message: `${updated.name} has been approved as a trainer.`,
      trainerId: updated.id,
    };
  }

  async rejectTrainer(trainerId: string, _reason?: string) {
    const trainer = await this.findPendingTrainer(trainerId);

    const updated = await this.prisma.user.update({
      where: { id: trainer.id },
      data: { approvalStatus: 'REJECTED' },
    });

    // TODO: once a notification system exists, email the trainer with
    // the rejection reason instead of silently dropping it.

    return {
      message: `${updated.name}'s trainer application has been rejected.`,
      trainerId: updated.id,
    };
  }

  private async findPendingTrainer(trainerId: string) {
    const trainer = await this.prisma.user.findUnique({
      where: { id: trainerId },
    });

    if (!trainer || trainer.role !== Role.TRAINER) {
      throw new NotFoundException('Trainer not found');
    }

    if (
      trainer.approvalStatus === 'APPROVED' ||
      trainer.approvalStatus === 'REJECTED'
    ) {
      throw new ConflictException(
        `This trainer's application has already been ${trainer.approvalStatus.toLowerCase()}`,
      );
    }

    return trainer;
  }

  async listApprovedTrainers() {
    return this.prisma.user.findMany({
      where: { role: Role.TRAINER, approvalStatus: 'APPROVED' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        bio: true,
        city: true,
        qualification: true,
        yearsExperience: true,
        rating: true,
        avatarUrl: true,
        trainerSharePercent: true,
        skills: true,
        createdAt: true,
        _count: { select: { coursesTaught: true, projectsTaught: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getPlatformStats() {
    return this.analyticsCache.getOrRefresh('platform-stats', () =>
      this.computePlatformStats(),
    );
  }

  private async computePlatformStats() {
    const [
      totalCourses,
      activeCourses,
      draftCourses,
      totalTracks,
      totalTrainers,
      pendingTrainers,
      totalStudents,
      totalEnrollments,
      activeEnrollments,
    ] = await this.prisma.$transaction([
      this.prisma.course.count(),
      this.prisma.course.count({ where: { status: 'ACTIVE' } }),
      this.prisma.course.count({ where: { status: 'DRAFT' } }),
      this.prisma.track.count(),
      this.prisma.user.count({
        where: { role: Role.TRAINER, approvalStatus: 'APPROVED' },
      }),
      this.prisma.user.count({
        where: { role: Role.TRAINER, approvalStatus: 'PENDING' },
      }),
      this.prisma.user.count({ where: { role: Role.STUDENT } }),
      this.prisma.enrollment.count(),
      this.prisma.enrollment.count({ where: { status: 'active' } }),
    ]);

    return {
      totalCourses,
      activeCourses,
      draftCourses,
      totalTracks,
      totalTrainers,
      pendingTrainers,
      totalStudents,
      totalEnrollments,
      activeEnrollments,
    };
  }

  async listAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        companyId: true,
        phone: true,
        role: true,
        isActive: true,
        emailVerified: true,
        avatarUrl: true,
        approvalStatus: true,
        trainerSharePercent: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        _count: { select: { enrollments: true, coursesTaught: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Global admin search across the whole platform: courses, users, trainers,
   * orders, coupons and leads. Used by the ops console top-bar search box —
   * returns lightweight preview objects grouped by type so the UI can render
   * a dropdown and deep-link into the right section.
   */
  async globalSearch(q: string) {
    const query = q.trim();
    if (!query) return { courses: [], users: [], trainers: [], orders: [], coupons: [], leads: [] };

    const contains = { contains: query, mode: 'insensitive' as const };

    const [courses, users, trainers, orders, coupons, leads] = await Promise.all([
      this.prisma.course.findMany({
        where: { OR: [{ title: contains }, { code: contains }, { category: contains }] },
        take: 8,
        select: {
          id: true,
          title: true,
          code: true,
          status: true,
          category: true,
          price: true,
          originalPrice: true,
        },
      }),
      this.prisma.user.findMany({
        where: {
          OR: [{ name: contains }, { email: contains }, { companyId: contains }],
        },
        take: 8,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          companyId: true,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.findMany({
        where: {
          role: Role.TRAINER,
          OR: [{ name: contains }, { email: contains }],
        },
        take: 8,
        select: {
          id: true,
          name: true,
          email: true,
          approvalStatus: true,
          rating: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.findMany({
        where: {
          OR: [
            { id: { contains: query, mode: 'insensitive' } },
            { razorpayOrderId: contains },
            { razorpayPaymentId: contains },
            { billingFullName: contains },
            { billingEmail: contains },
            { user: { OR: [{ name: contains }, { email: contains }] } },
          ],
        },
        take: 8,
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: { select: { course: { select: { title: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupon.findMany({
        where: { code: { contains: query.toUpperCase() } },
        take: 8,
        select: {
          id: true,
          code: true,
          discountType: true,
          value: true,
          currency: true,
          isActive: true,
          usedCount: true,
        },
      }),
      this.prisma.lead.findMany({
        where: {
          OR: [{ name: contains }, { email: contains }, { course: contains }],
        },
        take: 8,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          course: true,
          status: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      courses: courses.map((c) => ({
        id: c.id,
        title: c.title,
        code: c.code,
        status: c.status,
        category: c.category,
        price: c.price.toNumber(),
        originalPrice: c.originalPrice?.toNumber() ?? null,
      })),
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        companyId: u.companyId,
        isActive: u.isActive,
      })),
      trainers: trainers.map((t) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        approvalStatus: t.approvalStatus ?? 'PENDING',
        rating: t.rating,
      })),
      orders: orders.map((o) => ({
        id: o.id,
        orderNo: o.id.slice(0, 8).toUpperCase(),
        status: o.status,
        totalAmount: o.totalAmount.toNumber(),
        currency: o.currency,
        createdAt: o.createdAt,
        studentName: o.user?.name ?? o.billingFullName ?? null,
        studentEmail: o.user?.email ?? o.billingEmail ?? null,
        courseTitle: o.items[0]?.course?.title ?? null,
      })),
      coupons: coupons.map((c) => ({
        id: c.id,
        code: c.code,
        discountType: c.discountType,
        value: c.value.toNumber(),
        currency: c.currency,
        isActive: c.isActive,
        usedCount: c.usedCount,
      })),
      leads: leads.map((l) => ({
        id: l.id,
        name: l.name,
        email: l.email,
        phone: l.phone,
        course: l.course,
        status: l.status,
      })),
    };
  }

  /**
   * Sales dashboard fed from the real order book. Each order becomes a "lead"
   * row: CREATED → Hot (in pipeline), PAID → Warm (converted), anything else
   * (FAILED / CANCELLED / EXPIRED) → Cold. KPIs are computed from the same
   * orders so the numbers always reconcile with the data shown in the table.
   * Also lists every SALES role staff member with the leads/revenue attributed
   * to them via Order.salespersonId (0 when nothing assigned).
   */
  async getSalesDashboard() {
    return this.analyticsCache.getOrRefresh('sales-dashboard', () =>
      this.computeSalesDashboard(),
    );
  }

  private async computeSalesDashboard() {
    const [orders, salesStaff, careerLeads] = await Promise.all([
      this.prisma.order.findMany({
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
      this.prisma.lead.findMany({
        where: {
          OR: [
            { source: { in: ['career_guidance', 'fab', 'sidebar_card'] } },
            { salespersonId: null },
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          salesperson: { select: { id: true, name: true } },
        },
      }),
    ]);

    const salesRevenue = new Map<string, number>();
    const convertedCount = new Map<string, number>();
    const successValue = new Map<string, number>();
    for (const o of orders) {
      const totalAmountNum = o.totalAmount.toNumber();
      if (o.salespersonId) {
        salesRevenue.set(
          o.salespersonId,
          (salesRevenue.get(o.salespersonId) ?? 0) + totalAmountNum,
        );
        if (o.status === OrderStatus.PAID) {
          convertedCount.set(
            o.salespersonId,
            (convertedCount.get(o.salespersonId) ?? 0) + 1,
          );
          successValue.set(
            o.salespersonId,
            (successValue.get(o.salespersonId) ?? 0) + totalAmountNum,
          );
        }
      }
    }

    const staffRows = salesStaff.map((s) => {
      const leadsCount = s._count.salesOrders;
      const converted = convertedCount.get(s.id) ?? 0;
      const totalValue = salesRevenue.get(s.id) ?? 0;
      return {
        id: s.id,
        name: s.name,
        email: s.email,
        companyId: s.companyId,
        isActive: s.isActive,
        leadsCount,
        convertedCount: converted,
        conversionRate:
          leadsCount > 0 ? Math.round((converted / leadsCount) * 100) : 0,
        successValue: successValue.get(s.id) ?? 0,
        totalValue,
        avgValue: leadsCount > 0 ? totalValue / leadsCount : 0,
      };
    });

    const leads = orders.map((o) => {
      const status =
        o.status === OrderStatus.CREATED
          ? 'Hot'
          : o.status === OrderStatus.PAID
            ? 'Warm'
            : 'Cold';
      const firstItem = o.items[0];
      return {
        id: o.id,
        name: o.billingFullName ?? o.user?.name ?? 'Unknown',
        course: firstItem?.course?.title ?? '—',
        source: o.gatewayType ?? 'Checkout',
        status,
        orderStatus: o.status,
        date: o.createdAt.toISOString().slice(0, 10),
        value: o.totalAmount.toNumber(),
        salespersonId: o.salespersonId,
      };
    });

    // Public enquiries from the website forms (career guidance, sidebar card,
    // FAB). They start unassigned; once a salesperson claims one by editing it
    // they show up here with the real DB status and the assigned salesperson.
    const publicLeads = careerLeads.map((l) => {
      return {
        id: l.id,
        name: l.name,
        course: l.course ?? '—',
        source: l.source ?? 'Career Guidance',
        status: l.status,
        orderStatus: 'LEAD',
        date: l.createdAt.toISOString().slice(0, 10),
        value: l.budget?.toNumber() ?? 0,
        salespersonId: l.salespersonId,
        salespersonName: l.salesperson?.name ?? null,
        email: l.email,
        phone: l.phone,
      };
    });

    const hot = orders.filter((o) => o.status === OrderStatus.CREATED);
    const paid = orders.filter((o) => o.status === OrderStatus.PAID);
    const pipelineValue = hot.reduce((s, o) => s + o.totalAmount.toNumber(), 0);
    const paidValue = paid.reduce((s, o) => s + o.totalAmount.toNumber(), 0);
    const conversionRate =
      orders.length > 0 ? Math.round((paid.length / orders.length) * 100) : 0;
    const avgDealSize =
      paid.length > 0 ? paidValue / paid.length : 0;

    return {
      summary: {
        totalLeads: orders.length,
        activeLeads: hot.length,
        pipelineValue,
        totalRevenue: paidValue,
        convertedLeads: paid.length,
        conversionRate,
        avgDealSize,
      },
      salesStaff: staffRows,
      leads,
      publicLeads,
    };
  }

  /**
   * Admin directly creates a staff account (Coordinator, Support, Sales, …).
   * The email and a temporary password are generated automatically — the
   * account is created with mustChangePassword=true so the staff member is
   * forced to set their own password on first login.
   */
  async createStaffAccount(dto: CreateStaffDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const companyId = dto.companyId
      ? await this.ensureCompanyIdAvailable(dto.companyId)
      : await this.generateUniqueCompanyEmail(dto.name, dto.role);
    const tempPassword = this.generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        companyId,
        name: dto.name,
        phone: dto.phone,
        password: hashedPassword,
        role: dto.role,
        emailVerified: true,
        mustChangePassword: true,
        passwordExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        // Admin-created trainers still go through the same onboarding +
        // approval gate as self-registered ones — they log in, complete the
        // required-fields profile form, then wait for approval like anyone
        // else (see PENDING default on the User model / trainer console).
        ...(dto.role === 'TRAINER' && { approvalStatus: 'PENDING' }),
      },
    });

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const loginUrl = `${frontendUrl}/auth/staff-login`;
    await this.mailService.sendStaffCredentialsEmail(dto.email, {
      name: user.name,
      role: user.role,
      loginEmail: companyId,
      tempPassword,
      loginUrl,
    });

    return {
      message: `${user.name} has been created as ${dto.role}. Credentials sent to ${dto.email}.`,
      userId: user.id,
      email: dto.email,
      companyId,
      tempPassword,
      mustChangePassword: true,
      emailSent: true,
    };
  }

  /**
   * Regenerates a fresh temporary password for a user and emails it to them.
   * The new password is valid for 10 minutes and the user is forced to
   * change it on next login (mustChangePassword=true).
   */
  async regeneratePassword(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    if (user.role === Role.STUDENT) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          passwordResetToken: hashedToken,
          passwordResetExpires: expires,
          passwordExpiresAt: null,
        },
      });

      const resetUrl = `${frontendUrl}/auth/reset-password?token=${rawToken}&portal=student`;
      await this.mailService.sendPasswordResetEmail(user.email, resetUrl);

      return {
        message: `A password reset link has been emailed to ${user.email}.`,
        emailSent: true,
      };
    }

    const tempPassword = this.generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: true,
        passwordExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const loginUrl = `${frontendUrl}/auth/staff-login`;

    await this.mailService.sendPasswordRegeneratedEmail(user.email, {
      name: user.name,
      loginEmail: user.companyId ?? user.email,
      tempPassword,
      loginUrl,
    });

    return {
      message: `New password generated and emailed to ${user.email}.`,
      tempPassword,
      emailSent: true,
    };
  }

  /**
   * Admin can provide their own company email; if it's already taken, throw.
   */
  private async ensureCompanyIdAvailable(companyId: string): Promise<string> {
    const existing = await this.prisma.user.findUnique({
      where: { companyId },
    });

    if (existing) {
      throw new ConflictException(
        'This company email is already in use',
      );
    }

    return companyId;
  }

  /**
   * Builds a company email like `ramw.sales@futurestack.co.in` from the staff
   * member's name (first name + last name initial, lowercased) and role. If
   * the email is already taken, appends a numeric suffix (ramw2.sales@…).
   */
  private async generateUniqueCompanyEmail(
    name: string,
    role: string,
  ): Promise<string> {
    const parts = name.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const first = parts[0] ?? 'user';
    const lastInitial = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    const base = `${first}${lastInitial}`;
    const rolePart = role.toLowerCase();
    const domain = '@futurestack.co.in';

    let email = `${base}.${rolePart}${domain}`;
    let suffix = 2;
    while (await this.prisma.user.findUnique({ where: { companyId: email } })) {
      email = `${base}${suffix}.${rolePart}${domain}`;
      suffix++;
    }

    return email;
  }

  private generateTempPassword(): string {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    return password;
  }

  /**
   * Sets/clears a per-trainer share override (% the trainer keeps). A null
   * value resets to the global PaymentSettings default. Refuses once the
   * trainer has any revenue ledger entries — the split is locked in once
   * money starts flowing.
   */
  async updateTrainerShare(id: string, dto: UpdateTrainerShareDto) {
    const trainer = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!trainer || trainer.role !== Role.TRAINER) {
      throw new NotFoundException('Trainer not found');
    }

    const hasRevenue = await this.prisma.revenueLedger.count({
      where: { trainerId: id },
    });
    if (hasRevenue > 0) {
      throw new ConflictException(
        'Cannot change revenue split after revenue has been generated',
      );
    }

    await this.prisma.user.update({
      where: { id },
      data: { trainerSharePercent: dto.trainerSharePercent ?? null },
    });

    return {
      message: 'Revenue split updated',
      trainerSharePercent: dto.trainerSharePercent,
    };
  }

  async getVideoUploadCredentials(dto: UploadVideoDto) {
    const section = await this.prisma.section.findUnique({
      where: { id: dto.sectionId },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    // Re-upload: delete old VdoCipher video, update existing DB record
    if (dto.videoId) {
      const existing = await this.prisma.video.findUnique({
        where: { id: dto.videoId },
      });
      if (existing) {
        await this.vdoCipherService.deleteVideo(existing.vdoCipherId);
      }
    }

    const { vdoCipherId, uploadUrl, uploadCredentials } =
      await this.vdoCipherService.getUploadCredentials(dto.title);

    const video = dto.videoId
      ? await this.prisma.video.update({
          where: { id: dto.videoId },
          data: {
            title: dto.title,
            vdoCipherId,
            durationSeconds: 0,
            videoStatus: 'UPLOADING',
          },
        })
      : await this.prisma.video.create({
          data: {
            title: dto.title,
            sectionId: dto.sectionId,
            order: dto.order,
            vdoCipherId,
            durationSeconds: 0,
            videoStatus: 'UPLOADING',
          },
        });

    return {
      videoId: video.id,
      vdoCipherId,
      uploadUrl,
      uploadCredentials,
    };
  }

  async getVideoStatus(videoId: string) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        title: true,
        videoStatus: true,
        durationSeconds: true,
        vdoCipherId: true,
      },
    });

    if (!video) throw new NotFoundException('Video not found');
    return video;
  }

  async handleVdoCipherWebhook(payload: VdoCipherWebhookPayload) {
    this.logger.log(
      `Webhook received: ${payload.event} for video ${payload.payload.id}`,
    );

    switch (payload.event) {
      case 'video:ready':
        return this.handleVideoReady(payload);
      case 'video:updated':
        return this.handleVideoUpdated(payload);
      case 'video:deleted':
        return this.handleVideoDeleted(payload);
      case 'video:error':
        return this.handleVideoError(payload);
      case 'caption:ready':
        return this.handleCaptionReady(payload);
      case 'caption:deleted':
        return this.handleCaptionDeleted(payload);
      case 'poster:ready':
        return this.handlePosterReady(payload);
      default:
        this.logger.warn(`Unknown webhook event: ${payload.event}`);
        return { received: true };
    }
  }

  private async handleVideoReady(payload: VdoCipherWebhookPayload) {
    // Check course videos first
    const video = await this.prisma.video.findFirst({
      where: { vdoCipherId: payload.payload.id },
    });
    if (video) {
      await this.prisma.video.update({
        where: { id: video.id },
        data: {
          videoStatus: 'READY',
          ...(payload.payload.length
            ? { durationSeconds: payload.payload.length }
            : {}),
        },
      });
      this.logger.log(`Video ${video.id} marked as READY`);
      return { received: true };
    }

    // Check project curriculum videos
    const projectVideo = await this.prisma.projectCurriculumVideo.findFirst({
      where: { vdoCipherId: payload.payload.id },
    });
    if (projectVideo) {
      await this.prisma.projectCurriculumVideo.update({
        where: { id: projectVideo.id },
        data: {
          videoStatus: 'READY',
          ...(payload.payload.length
            ? { durationSeconds: payload.payload.length }
            : {}),
        },
      });
      this.logger.log(`Project video ${projectVideo.id} marked as READY`);
      return { received: true };
    }

    this.logger.warn(
      `Video not found for vdoCipherId: ${payload.payload.id}`,
    );
    return { received: true };
  }

  private async handleVideoUpdated(payload: VdoCipherWebhookPayload) {
    // Check course videos first
    const video = await this.prisma.video.findFirst({
      where: { vdoCipherId: payload.payload.id },
    });
    if (video) {
      await this.prisma.video.update({
        where: { id: video.id },
        data: {
          ...(payload.payload.title ? { title: payload.payload.title } : {}),
          ...(payload.payload.length
            ? { durationSeconds: payload.payload.length }
            : {}),
        },
      });
      this.logger.log(`Video ${video.id} metadata updated`);
      return { received: true };
    }

    // Check project curriculum videos
    const projectVideo = await this.prisma.projectCurriculumVideo.findFirst({
      where: { vdoCipherId: payload.payload.id },
    });
    if (projectVideo) {
      await this.prisma.projectCurriculumVideo.update({
        where: { id: projectVideo.id },
        data: {
          ...(payload.payload.title ? { title: payload.payload.title } : {}),
          ...(payload.payload.length
            ? { durationSeconds: payload.payload.length }
            : {}),
        },
      });
      this.logger.log(`Project video ${projectVideo.id} metadata updated`);
      return { received: true };
    }

    this.logger.warn(
      `Video not found for vdoCipherId: ${payload.payload.id}`,
    );
    return { received: true };
  }

  private async handleVideoDeleted(payload: VdoCipherWebhookPayload) {
    // Check course videos first
    const video = await this.prisma.video.findFirst({
      where: { vdoCipherId: payload.payload.id },
    });
    if (video) {
      await this.prisma.video.update({
        where: { id: video.id },
        data: { videoStatus: 'UPLOADING' },
      });
      this.logger.log(
        `Video ${video.id} reset to UPLOADING after deletion on VdoCipher`,
      );
      return { received: true };
    }

    // Check project curriculum videos
    const projectVideo = await this.prisma.projectCurriculumVideo.findFirst({
      where: { vdoCipherId: payload.payload.id },
    });
    if (projectVideo) {
      await this.prisma.projectCurriculumVideo.update({
        where: { id: projectVideo.id },
        data: { videoStatus: 'UPLOADING' },
      });
      this.logger.log(
        `Project video ${projectVideo.id} reset to UPLOADING after deletion on VdoCipher`,
      );
      return { received: true };
    }

    this.logger.warn(
      `Video not found for vdoCipherId: ${payload.payload.id}`,
    );
    return { received: true };
  }

  private async handleVideoError(payload: VdoCipherWebhookPayload) {
    // Check course videos first
    const video = await this.prisma.video.findFirst({
      where: { vdoCipherId: payload.payload.id },
    });
    if (video) {
      await this.prisma.video.update({
        where: { id: video.id },
        data: { videoStatus: 'FAILED' },
      });
      this.logger.error(
        `Video ${video.id} failed: ${payload.payload.error ?? 'Unknown error'}`,
      );
      return { received: true };
    }

    // Check project curriculum videos
    const projectVideo = await this.prisma.projectCurriculumVideo.findFirst({
      where: { vdoCipherId: payload.payload.id },
    });
    if (projectVideo) {
      await this.prisma.projectCurriculumVideo.update({
        where: { id: projectVideo.id },
        data: { videoStatus: 'FAILED' },
      });
      this.logger.error(
        `Project video ${projectVideo.id} failed: ${payload.payload.error ?? 'Unknown error'}`,
      );
      return { received: true };
    }

    this.logger.warn(
      `Video not found for vdoCipherId: ${payload.payload.id}`,
    );
    return { received: true };
  }

  private async handleCaptionReady(payload: VdoCipherWebhookPayload) {
    const video = await this.prisma.video.findFirst({
      where: { vdoCipherId: payload.payload.id },
    });
    if (!video) {
      this.logger.warn(
        `Video not found for vdoCipherId: ${payload.payload.id}`,
      );
      return { received: true };
    }

    this.logger.log(
      `Caption ready for video ${video.id}: language=${payload.payload.language}, captionId=${payload.payload.captionId}`,
    );

    return { received: true };
  }

  private async handleCaptionDeleted(payload: VdoCipherWebhookPayload) {
    const video = await this.prisma.video.findFirst({
      where: { vdoCipherId: payload.payload.id },
    });
    if (!video) {
      this.logger.warn(
        `Video not found for vdoCipherId: ${payload.payload.id}`,
      );
      return { received: true };
    }

    this.logger.log(
      `Caption deleted for video ${video.id}: language=${payload.payload.language}, captionId=${payload.payload.captionId}`,
    );

    return { received: true };
  }

  private async handlePosterReady(payload: VdoCipherWebhookPayload) {
    const video = await this.prisma.video.findFirst({
      where: { vdoCipherId: payload.payload.id },
    });
    if (!video) {
      this.logger.warn(
        `Video not found for vdoCipherId: ${payload.payload.id}`,
      );
      return { received: true };
    }

    this.logger.log(
      `Poster ready for video ${video.id}: ${payload.payload.posterUrl ?? 'N/A'}`,
    );

    return { received: true };
  }

  // ── ENROLLMENT MANAGEMENT ────────────────────────────────────────

  async listEnrollments(page = 1, perPage = 20, search?: string) {
    const skip = (page - 1) * perPage;
    const where: any = {};
    if (search) {
      where.OR = [
        { student: { name: { contains: search, mode: 'insensitive' } } },
        { student: { email: { contains: search, mode: 'insensitive' } } },
        { course: { title: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [enrollments, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        skip,
        take: perPage,
        where,
        orderBy: { enrolledAt: 'desc' },
        include: {
          student: { select: { id: true, name: true, email: true } },
          course: { select: { id: true, title: true } },
          order: { select: { id: true, status: true } },
        },
      }),
      this.prisma.enrollment.count({ where }),
    ]);

    return {
      enrollments: enrollments.map((e) => ({
        id: e.id,
        studentName: e.student.name,
        studentEmail: e.student.email,
        studentId: e.studentId,
        courseTitle: e.course.title,
        courseId: e.courseId,
        amountPaid: e.amountPaid.toNumber(),
        status: e.status,
        enrolledAt: e.enrolledAt.toISOString(),
        orderId: e.orderId,
        orderStatus: e.order?.status ?? null,
      })),
      total,
      page,
      perPage,
      pageCount: Math.ceil(total / perPage),
    };
  }

  async manualEnroll(studentId: string, courseId: string, amountPaid: number) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, role: true },
    });
    if (!student || student.role !== Role.STUDENT) {
      throw new BadRequestException('Invalid student');
    }

    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new BadRequestException('Course not found');

    const existing = await this.prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
    });
    if (existing) throw new ConflictException('Student is already enrolled in this course');

    const enrollment = await this.prisma.enrollment.create({
      data: { studentId, courseId, amountPaid, status: 'active' },
      include: {
        student: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    });

    return {
      id: enrollment.id,
      studentName: enrollment.student.name,
      courseTitle: enrollment.course.title,
      amountPaid: enrollment.amountPaid.toNumber(),
      status: enrollment.status,
      enrolledAt: enrollment.enrolledAt.toISOString(),
    };
  }

  async unenroll(enrollmentId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    await this.prisma.enrollment.delete({ where: { id: enrollmentId } });
    return { message: 'Enrollment removed' };
  }

  // ── CSV EXPORTS ──────────────────────────────────────────────────

  async exportRevenueCsv(): Promise<string> {
    const orders = await this.prisma.order.findMany({
      where: { status: OrderStatus.PAID },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        items: { include: { course: { select: { title: true } } } },
        salesperson: { select: { name: true } },
      },
    });

    const header = 'Date,Order ID,Student,Course,Amount,GST,Salesperson\n';
    const rows = orders.map((o) => {
      const date = o.createdAt.toISOString().slice(0, 10);
      const student = o.user?.name ?? '—';
      const course = o.items[0]?.course?.title ?? '—';
      const salesperson = o.salesperson?.name ?? '—';
      return `${date},${o.id},${student},${course},${o.totalAmount.toNumber()},${o.gstAmount.toNumber()},${salesperson}`;
    }).join('\n');

    return header + rows;
  }

  async exportLeadsCsv(): Promise<string> {
    const leads = await this.prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        salesperson: { select: { name: true } },
      },
    });

    const header = 'Date,Name,Email,Phone,Course,Status,Source,Score,Budget,Salesperson\n';
    const rows = leads.map((l) => {
      const date = l.createdAt.toISOString().slice(0, 10);
      const salesperson = l.salesperson?.name ?? '—';
      return `${date},${l.name},${l.email ?? ''},${l.phone ?? ''},${l.course ?? ''},${l.status},${l.source ?? ''},${l.score},${l.budget.toNumber()},${salesperson}`;
    }).join('\n');

    return header + rows;
  }

  async exportConversionsCsv(): Promise<string> {
    const orders = await this.prisma.order.findMany({
      where: { status: OrderStatus.PAID },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        items: { include: { course: { select: { title: true } } } },
        salesperson: { select: { name: true } },
      },
    });

    const header = 'Converted Date,Student,Course,Amount,Payment Method,Salesperson\n';
    const rows = orders.map((o) => {
      const date = o.updatedAt.toISOString().slice(0, 10);
      const student = o.user?.name ?? '—';
      const course = o.items[0]?.course?.title ?? '—';
      const salesperson = o.salesperson?.name ?? '—';
      return `${date},${student},${course},${o.totalAmount.toNumber()},${o.paymentMethod ?? '—'},${salesperson}`;
    }).join('\n');

    return header + rows;
  }
}
