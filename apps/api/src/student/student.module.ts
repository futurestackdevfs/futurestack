import { Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { CertificatesModule } from '../certificates/certificates.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [CertificatesModule, UploadModule],
  controllers: [StudentController],
  providers: [StudentService],
})
export class StudentModule {}