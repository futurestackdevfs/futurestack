import { NotFoundException } from '@nestjs/common';
import { LegalPagesService, KNOWN_LEGAL_SLUGS } from './legal-pages.service';
import { PrismaService } from '../prisma/prisma.service';

// Fully mocked PrismaService — no live DB connection is ever opened by this file.
function makePrismaMock() {
  return {
    legalPage: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  } as unknown as PrismaService;
}

function makePageRow(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: '__spec__page-1',
    slug: 'terms',
    title: 'Terms',
    content: 'Some terms content',
    updatedAt: new Date('2026-09-01T00:00:00Z'),
    ...overrides,
  };
}

describe('LegalPagesService', () => {
  let service: LegalPagesService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new LegalPagesService(prisma);
  });

  describe('getAll()', () => {
    it('seeds any missing known slug with an empty draft, then returns all four', async () => {
      (prisma.legalPage.findMany as jest.Mock)
        .mockResolvedValueOnce([makePageRow({ slug: 'terms' })]) // only 1 of 4 exists
        .mockResolvedValueOnce([
          makePageRow({ slug: 'terms' }),
          makePageRow({ slug: 'privacy-policy' }),
          makePageRow({ slug: 'refund-policy' }),
          makePageRow({ slug: 'cookie-policy' }),
        ]);
      (prisma.legalPage.create as jest.Mock).mockResolvedValue({});

      const result = await service.getAll();

      // 3 missing slugs (privacy-policy, refund-policy, cookie-policy) get seeded
      expect(prisma.legalPage.create).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(4);
    });

    it('does not create anything when all four slugs already exist', async () => {
      const allFour = KNOWN_LEGAL_SLUGS.map((slug) => makePageRow({ slug }));
      (prisma.legalPage.findMany as jest.Mock).mockResolvedValue(allFour);

      const result = await service.getAll();

      expect(prisma.legalPage.create).not.toHaveBeenCalled();
      expect(result).toEqual(allFour);
    });
  });

  describe('getOne()', () => {
    it('throws 404 for an unknown slug', async () => {
      await expect(service.getOne('made-up-slug')).rejects.toThrow(NotFoundException);
    });

    it('lazily creates the page row on first access for a known slug', async () => {
      (prisma.legalPage.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.legalPage.create as jest.Mock).mockResolvedValue(
        makePageRow({ slug: 'privacy-policy', title: 'Privacy Policy', content: '' }),
      );

      const result = await service.getOne('privacy-policy');

      expect(prisma.legalPage.create).toHaveBeenCalledWith({
        data: { slug: 'privacy-policy', title: 'Privacy Policy', content: '' },
      });
      expect(result.slug).toBe('privacy-policy');
    });

    it('returns the existing row without creating when already present', async () => {
      (prisma.legalPage.findUnique as jest.Mock).mockResolvedValue(makePageRow());

      const result = await service.getOne('terms');
      expect(prisma.legalPage.create).not.toHaveBeenCalled();
      expect(result.slug).toBe('terms');
    });
  });

  describe('getPublic()', () => {
    it('throws 404 for an unknown slug', async () => {
      await expect(service.getPublic('made-up-slug')).rejects.toThrow(NotFoundException);
    });

    it('throws 404 when the page has never been published (empty content)', async () => {
      (prisma.legalPage.findUnique as jest.Mock).mockResolvedValue(
        makePageRow({ content: '' }),
      );

      await expect(service.getPublic('terms')).rejects.toThrow(NotFoundException);
    });

    it('throws 404 when the page row does not exist at all', async () => {
      (prisma.legalPage.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getPublic('terms')).rejects.toThrow(NotFoundException);
    });

    it('returns the page when it has real content', async () => {
      (prisma.legalPage.findUnique as jest.Mock).mockResolvedValue(makePageRow());

      const result = await service.getPublic('terms');
      expect(result.content).toBe('Some terms content');
    });
  });

  describe('update()', () => {
    it('throws 404 for an unknown slug', async () => {
      await expect(
        service.update('made-up-slug', { content: 'x' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates content and falls back to the existing title when none is given', async () => {
      (prisma.legalPage.findUnique as jest.Mock).mockResolvedValue(makePageRow());
      (prisma.legalPage.update as jest.Mock).mockResolvedValue(
        makePageRow({ content: 'Updated content' }),
      );

      const result = await service.update('terms', { content: 'Updated content' } as any);

      expect(prisma.legalPage.update).toHaveBeenCalledWith({
        where: { slug: 'terms' },
        data: { title: 'Terms', content: 'Updated content' },
      });
      expect(result.content).toBe('Updated content');
    });

    it('overwrites the title when a new one is given', async () => {
      (prisma.legalPage.findUnique as jest.Mock).mockResolvedValue(makePageRow());
      (prisma.legalPage.update as jest.Mock).mockResolvedValue({});

      await service.update('terms', { title: 'New Title', content: 'x' } as any);

      expect(prisma.legalPage.update).toHaveBeenCalledWith({
        where: { slug: 'terms' },
        data: { title: 'New Title', content: 'x' },
      });
    });
  });
});
