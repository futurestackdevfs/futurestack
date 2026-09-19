import { Body, Controller, Delete, Get, Header, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { Audit } from '../audit/audit.decorator';
import { CareersService } from './careers.service';
import { CreateJobPostingDto } from './dto/create-job-posting.dto';

@Controller()
export class CareersController {
  constructor(private readonly careersService: CareersService) {}

  /** Public — no auth, consumed by the /careers page. */
  @Header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
  @Get('careers/jobs')
  findAllPublic() {
    return this.careersService.findAll();
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Get('admin/careers/jobs')
  findAllForAdmin() {
    return this.careersService.findAll();
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Audit({ action: 'CREATE', entity: 'JobPosting', idFrom: 'response' })
  @Post('admin/careers/jobs')
  create(@Body() dto: CreateJobPostingDto) {
    return this.careersService.create(dto);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Audit({ action: 'DELETE', entity: 'JobPosting', idFrom: 'param' })
  @Delete('admin/careers/jobs/:id')
  remove(@Param('id') id: string) {
    return this.careersService.remove(id);
  }
}
