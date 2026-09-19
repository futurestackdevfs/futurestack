import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';
import { decimal } from '../test-utils/fixtures';

// Fully mocked PrismaService / S3Service / VdoCipherService — no live DB
// connection or external upload call is ever made by this file.
function makePrismaMock() {
  return {
    project: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    projectCurriculum: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    projectCurriculumVideo: {
      createMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    order: { findMany: jest.fn() },
    orderItem: { findFirst: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  } as unknown as PrismaService;
}

function makeProjectRow(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: '__spec__project-1',
    name: '__spec__ Full-Stack Capstone',
    price: decimal(15000),
    originalPrice: decimal(20000),
    priceUsd: decimal(199),
    originalPriceUsd: decimal(249),
    image: null,
    trainer: null,
    curriculum: [],
    _count: { orderItems: 0 },
    ...overrides,
  };
}

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let s3: { deleteByUrl: jest.Mock };
  let vdo: any;

  beforeEach(() => {
    prisma = makePrismaMock();
    s3 = { deleteByUrl: jest.fn() };
    vdo = { getUploadCredentials: jest.fn(), deleteVideo: jest.fn() };
    service = new ProjectsService(prisma, s3 as any, vdo);
  });

  describe('toPlainProject() Decimal-strip behavior (via public methods)', () => {
    it('listActive() converts every Decimal money field to a plain number', async () => {
      (prisma.project.findMany as jest.Mock).mockResolvedValue([makeProjectRow()]);

      const [result] = await service.listActive();

      expect(result.price).toBe(15000);
      expect(typeof result.price).toBe('number');
      expect(result.originalPrice).toBe(20000);
      expect(result.priceUsd).toBe(199);
      expect(result.originalPriceUsd).toBe(249);
      // Confirm it's really a plain number, not still wrapped in Decimal
      expect(result.price).not.toHaveProperty('toNumber');
    });

    it('getById() converts Decimal fields and returns null for absent priceUsd/originalPrice', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(
        makeProjectRow({
          originalPrice: null,
          priceUsd: null,
          originalPriceUsd: null,
          curriculum: [],
        }),
      );

      const result = await service.getById('__spec__project-1');

      expect(result.price).toBe(15000);
      expect(result.originalPrice).toBeNull();
      expect(result.priceUsd).toBeNull();
      expect(result.originalPriceUsd).toBeNull();
    });

    it('getById() throws 404 for a missing project', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.getById('__spec__missing')).rejects.toThrow(NotFoundException);
    });

    it('listAll() (admin) also strips Decimal fields to plain numbers', async () => {
      (prisma.project.findMany as jest.Mock).mockResolvedValue([
        makeProjectRow({ _count: { curriculum: 3, orderItems: 5 } }),
      ]);

      const [result] = await service.listAll();
      expect(result.price).toBe(15000);
      expect(typeof result.originalPrice).toBe('number');
    });

    it('create() returns the newly created project with Decimal fields converted', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null); // name uniqueness
      (prisma.project.create as jest.Mock).mockResolvedValue(makeProjectRow());

      const result = await service.create({
        name: '__spec__ Full-Stack Capstone',
        level: 'INTERMEDIATE',
        price: 15000,
        originalPrice: 20000,
        priceUsd: 199,
        originalPriceUsd: 249,
        category: 'web',
      } as any);

      expect(result.price).toBe(15000);
      expect(typeof result.price).toBe('number');
    });

    it('update() returns the updated project with Decimal fields converted', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(makeProjectRow());
      (prisma.project.update as jest.Mock).mockResolvedValue(
        makeProjectRow({ price: decimal(18000) }),
      );

      const result = await service.update('__spec__project-1', { price: 18000 } as any);
      expect(result.price).toBe(18000);
    });
  });

  describe('create() validation', () => {
    it('rejects a duplicate project name', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(makeProjectRow());

      await expect(
        service.create({ name: '__spec__ Full-Stack Capstone', level: 'INTERMEDIATE' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects an unknown trainerId', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create({
          name: '__spec__ New Project',
          level: 'INTERMEDIATE',
          trainerId: '__spec__nonexistent',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete()', () => {
    it('deletes the project and best-effort cleans up its S3 image', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(
        makeProjectRow({ image: 'https://cdn.example.com/img.png' }),
      );
      (prisma.project.delete as jest.Mock).mockResolvedValue({});

      const result = await service.delete('__spec__project-1');

      expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: '__spec__project-1' } });
      expect(s3.deleteByUrl).toHaveBeenCalledWith('https://cdn.example.com/img.png');
      expect(result.message).toBe('Project deleted');
    });

    it('does not fail the delete if the S3 cleanup call throws', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(
        makeProjectRow({ image: 'https://cdn.example.com/img.png' }),
      );
      (prisma.project.delete as jest.Mock).mockResolvedValue({});
      s3.deleteByUrl.mockRejectedValue(new Error('S3 unreachable'));

      const result = await service.delete('__spec__project-1');
      expect(result.message).toBe('Project deleted');
    });
  });

  describe('replaceCurriculum()', () => {
    it('replaces existing curriculum items and their videos', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(makeProjectRow());
      (prisma.projectCurriculum.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
      (prisma.projectCurriculum.create as jest.Mock).mockResolvedValue({
        id: '__spec__curriculum-1',
      });
      (prisma.projectCurriculumVideo.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await service.replaceCurriculum('__spec__project-1', {
        items: [
          {
            week: 'Week 1',
            title: 'Intro',
            desc: 'desc',
            videos: [{ title: 'Video 1', vdoCipherId: 'abc', durationSeconds: 120 }],
          },
        ],
      } as any);

      expect(prisma.projectCurriculum.deleteMany).toHaveBeenCalledWith({
        where: { projectId: '__spec__project-1' },
      });
      expect(result).toEqual({ success: true, count: 1 });
    });

    it('handles an empty curriculum list (clears everything)', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(makeProjectRow());
      (prisma.projectCurriculum.deleteMany as jest.Mock).mockResolvedValue({ count: 3 });

      const result = await service.replaceCurriculum('__spec__project-1', {
        items: [],
      } as any);

      expect(result).toEqual({ success: true });
      expect(prisma.projectCurriculum.create).not.toHaveBeenCalled();
    });
  });
});
