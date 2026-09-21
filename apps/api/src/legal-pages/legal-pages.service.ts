import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateLegalPageDto } from './dto/update-legal-page.dto';

// "sitemap" is intentionally NOT a managed slug — it's a static, hardcoded
// popup on the frontend (apps/web/app/(student)/components/legal-page-modal.tsx),
// not admin-editable content.
export const KNOWN_LEGAL_SLUGS = [
  'terms',
  'privacy-policy',
  'refund-policy',
  'cookie-policy',
] as const;

export type LegalPageSlug = (typeof KNOWN_LEGAL_SLUGS)[number];

function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

@Injectable()
export class LegalPagesService {
  constructor(private readonly prisma: PrismaService) {}

  private isKnownSlug(slug: string): slug is LegalPageSlug {
    return (KNOWN_LEGAL_SLUGS as readonly string[]).includes(slug);
  }

  /** Returns all 4 known pages, seeding any missing slug with an empty draft. */
  async getAll() {
    const existing = await this.prisma.legalPage.findMany();
    const existingSlugs = new Set(existing.map((p) => p.slug));
    const missing = KNOWN_LEGAL_SLUGS.filter((s) => !existingSlugs.has(s));

    if (missing.length > 0) {
      await Promise.all(
        missing.map((slug) =>
          this.prisma.legalPage.create({
            data: { slug, title: titleCase(slug), content: '' },
          }),
        ),
      );
      return this.prisma.legalPage.findMany();
    }

    return existing;
  }

  async getOne(slug: string) {
    if (!this.isKnownSlug(slug)) {
      throw new NotFoundException('Unknown legal page');
    }
    let page = await this.prisma.legalPage.findUnique({ where: { slug } });
    if (!page) {
      page = await this.prisma.legalPage.create({
        data: { slug, title: titleCase(slug), content: '' },
      });
    }
    return page;
  }

  async getPublic(slug: string) {
    if (!this.isKnownSlug(slug)) {
      throw new NotFoundException('Unknown legal page');
    }
    const page = await this.prisma.legalPage.findUnique({ where: { slug } });
    if (!page || !page.content) {
      throw new NotFoundException('This page has not been published yet');
    }
    return page;
  }

  async update(slug: string, dto: UpdateLegalPageDto) {
    if (!this.isKnownSlug(slug)) {
      throw new NotFoundException('Unknown legal page');
    }
    const existing = await this.getOne(slug);
    return this.prisma.legalPage.update({
      where: { slug },
      data: {
        title: dto.title ?? existing.title,
        content: dto.content,
      },
    });
  }
}
