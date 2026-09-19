import { NotFoundException } from '@nestjs/common';
import { CareersService } from './careers.service';
import { PrismaService } from '../prisma/prisma.service';

// Fully mocked PrismaService — no live DB connection is ever opened by this file.
function makePrismaMock() {
  return {
    jobPosting: { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
  } as unknown as PrismaService;
}

describe('CareersService', () => {
  let service: CareersService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new CareersService(prisma);
  });

  describe('findAll()', () => {
    it('returns postings ordered by newest first', async () => {
      (prisma.jobPosting.findMany as jest.Mock).mockResolvedValue([
        { id: '__spec__job-1', title: '__spec__ Backend Engineer' },
      ]);

      const result = await service.findAll();

      expect(prisma.jobPosting.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('create()', () => {
    it('creates a job posting, defaulting description to null when omitted', async () => {
      (prisma.jobPosting.create as jest.Mock).mockResolvedValue({
        id: '__spec__job-1',
        title: '__spec__ Backend Engineer',
        duration: 'Full-time',
        description: null,
      });

      const result = await service.create({
        title: '__spec__ Backend Engineer',
        duration: 'Full-time',
      } as any);

      expect(prisma.jobPosting.create).toHaveBeenCalledWith({
        data: {
          title: '__spec__ Backend Engineer',
          duration: 'Full-time',
          description: null,
        },
      });
      expect(result.description).toBeNull();
    });

    it('passes through a provided description', async () => {
      (prisma.jobPosting.create as jest.Mock).mockResolvedValue({});

      await service.create({
        title: '__spec__ Backend Engineer',
        duration: 'Full-time',
        description: 'Build our API',
      } as any);

      expect(prisma.jobPosting.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ description: 'Build our API' }),
      });
    });
  });

  describe('remove()', () => {
    it('throws 404 for a job posting that does not exist', async () => {
      (prisma.jobPosting.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('__spec__missing')).rejects.toThrow(NotFoundException);
      expect(prisma.jobPosting.delete).not.toHaveBeenCalled();
    });

    it('deletes an existing job posting', async () => {
      (prisma.jobPosting.findUnique as jest.Mock).mockResolvedValue({ id: '__spec__job-1' });
      (prisma.jobPosting.delete as jest.Mock).mockResolvedValue({ id: '__spec__job-1' });

      await service.remove('__spec__job-1');
      expect(prisma.jobPosting.delete).toHaveBeenCalledWith({ where: { id: '__spec__job-1' } });
    });
  });
});
