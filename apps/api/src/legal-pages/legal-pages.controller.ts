import { Body, Controller, Get, Header, Param, Patch } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { Audit } from '../audit/audit.decorator';
import { LegalPagesService } from './legal-pages.service';
import { UpdateLegalPageDto } from './dto/update-legal-page.dto';

@Controller()
export class LegalPagesController {
  constructor(private readonly legalPagesService: LegalPagesService) {}

  @Auth(Role.ADMIN)
  @Get('admin/legal-pages')
  getAll() {
    return this.legalPagesService.getAll();
  }

  @Auth(Role.ADMIN)
  @Get('admin/legal-pages/:slug')
  getOne(@Param('slug') slug: string) {
    return this.legalPagesService.getOne(slug);
  }

  @Auth(Role.ADMIN)
  @Audit({ action: 'UPDATE', entity: 'LegalPage', idFrom: 'param', idParam: 'slug' })
  @Patch('admin/legal-pages/:slug')
  update(@Param('slug') slug: string, @Body() dto: UpdateLegalPageDto) {
    return this.legalPagesService.update(slug, dto);
  }

  /** Public — no auth, consumed by the legal page popup on the site. */
  @Header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=300')
  @Get('legal-pages/:slug')
  getPublic(@Param('slug') slug: string) {
    return this.legalPagesService.getPublic(slug);
  }
}
