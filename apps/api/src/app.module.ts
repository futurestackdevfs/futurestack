import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StudentModule } from './student/student.module';
<<<<<<< HEAD
import { CourseModule } from './course/course.module';
=======
import { AdminModule } from './admin/admin.module';
>>>>>>> 6b056dc7a95e2d8de25e98037e56cc82b2902b43

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    StudentModule,
<<<<<<< HEAD
    CourseModule,
=======
    AdminModule,
>>>>>>> 6b056dc7a95e2d8de25e98037e56cc82b2902b43
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}