import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BlogApiKeyGuard } from './blog/blog-api-key.guard';
import { validateEnv } from './config.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StudentModule } from './student/student.module';
import { AdminModule } from './admin/admin.module';
import { BlogModule } from './blog/blog.module';
import { CoursesModule } from './courses/courses.module';
import { UploadModule } from './upload/upload.module';
import { DiscussionModule } from './discussion/discussion.module';
import { CertificatesModule } from './certificates/certificates.module';
import { TrainerModule } from './trainer/trainer.module';
import { VdoCipherModule } from './vdocipher/vdocipher.module';
import { ReviewsModule } from './reviews/reviews.module';
import { CouponModule } from './coupon/coupon.module';
import { CartModule } from './cart/cart.module';
import { CheckoutModule } from './checkout/checkout.module';
import { PaymentSettingsModule } from './payment-settings/payment-settings.module';
import { LegalPagesModule } from './legal-pages/legal-pages.module';
import { AdminPaymentsModule } from './admin-payments/admin-payments.module';
import { SalesModule } from './sales/sales.module';
import { SalesTargetsModule } from './sales-targets/sales-targets.module';
import { InvoicesModule } from './invoices/invoices.module';
import { CoordinatorModule } from './coordinator/coordinator.module';
import { ProjectsModule } from './projects/projects.module';
import { RefundModule } from './refund/refund.module';
import { SupportModule } from './support/support.module';
import { ContactModule } from './contact/contact.module';
import { CareersModule } from './careers/careers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: Number(config.get('THROTTLE_TTL') ?? 60_000),
            limit: Number(config.get('THROTTLE_LIMIT') ?? 60),
          },
        ],
      }),
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    StudentModule,
    AdminModule,
    BlogModule,
    CoursesModule,
    UploadModule,
    DiscussionModule,
    CertificatesModule,
    TrainerModule,
    VdoCipherModule,
    ScheduleModule.forRoot(),
    ReviewsModule,
    CouponModule,
    CartModule,
    CheckoutModule,
    PaymentSettingsModule,
    LegalPagesModule,
    AdminPaymentsModule,
    SalesModule,
    SalesTargetsModule,
    InvoicesModule,
    CoordinatorModule,
    ProjectsModule,
    RefundModule,
    SupportModule,
    ContactModule,
    CareersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    BlogApiKeyGuard,
  ],
})
export class AppModule {}
