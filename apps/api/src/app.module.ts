import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StudentModule } from './student/student.module';
import { AdminModule } from './admin/admin.module';
import { CoursesModule } from './courses/courses.module';
<<<<<<< HEAD
import { UploadModule } from './upload/upload.module';
=======
import { DiscussionModule } from './discussion/discussion.module';
>>>>>>> 6e97d375bd37f084083c28b8923d2bc07267d32d

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
<<<<<<< HEAD
    UploadModule,
=======
    DiscussionModule,
>>>>>>> 6e97d375bd37f084083c28b8923d2bc07267d32d
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
export class AppModule { }