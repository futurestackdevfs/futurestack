import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StudentModule } from './student/student.module';
import { AdminModule } from './admin/admin.module';
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
import { AdminPaymentsModule } from './admin-payments/admin-payments.module';
import { SalesModule } from './sales/sales.module';
import { CoordinatorModule } from './coordinator/coordinator.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
    AuthModule,
    StudentModule,
    AdminModule,
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
    AdminPaymentsModule,
    SalesModule,
    CoordinatorModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
