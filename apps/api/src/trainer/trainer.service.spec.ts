import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TrainerService } from './trainer.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../upload/s3.service';
import { EscalationsService } from '../escalations/escalations.service';

// Fully mocked PrismaService / S3Service / EscalationsService — no live DB is opened.
function makePrismaMock() {
  return {
    user: { findUnique: jest.fn() },
    enrollment: { findFirst: jest.fn() },
  } as unknown as PrismaService;
}

describe('TrainerService.flagStudent()', () => {
  let service: TrainerService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let escalations: { flagStudent: jest.Mock };

  beforeEach(() => {
    prisma = makePrismaMock();
    escalations = { flagStudent: jest.fn().mockResolvedValue({}) };
    service = new TrainerService(
      prisma,
      {} as S3Service,
      escalations as unknown as EscalationsService,
    );
    (prisma.user.findUnique as jest.Mock).mockImplementation(
      async ({ where }: { where: { id: string } }) =>
        where.id === '__spec__trainer'
          ? { id: where.id, name: 'Tina' }
          : { id: where.id, name: 'Stu' },
    );
  });

  it('raises an escalation for a student enrolled in the trainer’s course', async () => {
    (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue({ id: 'e1' });

    const res = await service.flagStudent('__spec__trainer', '__spec__student', 'Absent');

    expect(prisma.enrollment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId: '__spec__student', course: { trainerId: '__spec__trainer' } },
      }),
    );
    expect(escalations.flagStudent).toHaveBeenCalledWith('__spec__student', 'Absent', {
      id: '__spec__trainer',
      name: 'Tina',
    });
    expect(res.success).toBe(true);
  });

  it('refuses to flag a student who is not in any of the trainer’s courses', async () => {
    (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.flagStudent('__spec__trainer', '__spec__student', 'x'),
    ).rejects.toThrow(ForbiddenException);
    expect(escalations.flagStudent).not.toHaveBeenCalled();
  });

  it('404s for an unknown id — the old numeric row id can never match', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.flagStudent('__spec__trainer', '12345678', 'x')).rejects.toThrow(
      NotFoundException,
    );
  });
});
