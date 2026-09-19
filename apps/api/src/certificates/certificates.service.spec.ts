import { CertificatesService } from './certificates.service';
import { PrismaService } from '../prisma/prisma.service';

function makePrismaMock() {
  return {
    certificate: { findUnique: jest.fn(), count: jest.fn(), create: jest.fn() },
    video: { count: jest.fn() },
    quiz: { count: jest.fn() },
    videoProgress: { count: jest.fn() },
    quizAttempt: { count: jest.fn(), findMany: jest.fn() },
    course: { findUnique: jest.fn() },
  } as unknown as PrismaService;
}

describe('CertificatesService#checkAndIssueCertificate', () => {
  let service: CertificatesService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new CertificatesService(prisma);
  });

  const studentId = '__spec__student-9';
  const courseId = '__spec__course-fullstack';

  it('does nothing if a certificate already exists for this student+course', async () => {
    (prisma.certificate.findUnique as jest.Mock).mockResolvedValue({ id: '__spec__cert-1' });

    const result = await service.checkAndIssueCertificate(studentId, courseId);

    expect(result).toEqual({ issued: false });
    expect(prisma.certificate.create).not.toHaveBeenCalled();
  });

  it('refuses to issue for a course with no videos and no quizzes at all', async () => {
    (prisma.certificate.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.video.count as jest.Mock).mockResolvedValue(0);
    (prisma.quiz.count as jest.Mock).mockResolvedValue(0);
    (prisma.videoProgress.count as jest.Mock).mockResolvedValue(0);
    (prisma.quizAttempt.count as jest.Mock).mockResolvedValue(0);

    const result = await service.checkAndIssueCertificate(studentId, courseId);

    expect(result).toEqual({ issued: false });
    expect(prisma.certificate.create).not.toHaveBeenCalled();
  });

  it('does not issue while some videos or quizzes are still incomplete', async () => {
    (prisma.certificate.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.video.count as jest.Mock).mockResolvedValue(10);
    (prisma.quiz.count as jest.Mock).mockResolvedValue(2);
    (prisma.videoProgress.count as jest.Mock).mockResolvedValue(9); // one short
    (prisma.quizAttempt.count as jest.Mock).mockResolvedValue(2);

    const result = await service.checkAndIssueCertificate(studentId, courseId);

    expect(result).toEqual({ issued: false });
    expect(prisma.certificate.create).not.toHaveBeenCalled();
  });

  it('issues a certificate once every video and quiz is complete, with a well-formed credential ID', async () => {
    (prisma.certificate.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.video.count as jest.Mock).mockResolvedValue(10);
    (prisma.quiz.count as jest.Mock).mockResolvedValue(2);
    (prisma.videoProgress.count as jest.Mock).mockResolvedValue(10);
    (prisma.quizAttempt.count as jest.Mock).mockResolvedValue(2);
    (prisma.quizAttempt.findMany as jest.Mock).mockResolvedValue([
      { score: 80 },
      { score: 100 },
    ]);
    (prisma.certificate.count as jest.Mock).mockResolvedValue(4); // rank -> 5th
    (prisma.course.findUnique as jest.Mock).mockResolvedValue({ code: 'FSD101' });
    (prisma.certificate.create as jest.Mock).mockResolvedValue({});

    const result = await service.checkAndIssueCertificate(studentId, courseId);

    expect(result.issued).toBe(true);
    const year = new Date().getFullYear();
    expect(result.credentialId).toBe(`FS-${year}-FSD101-005`);
    expect(prisma.certificate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId,
        courseId,
        score: 90, // average of 80 and 100
        rank: 5,
      }),
    });
  });

  it('falls back to a derived course code when Course.code is not set', async () => {
    (prisma.certificate.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.video.count as jest.Mock).mockResolvedValue(1);
    (prisma.quiz.count as jest.Mock).mockResolvedValue(0);
    (prisma.videoProgress.count as jest.Mock).mockResolvedValue(1);
    (prisma.quizAttempt.count as jest.Mock).mockResolvedValue(0);
    (prisma.quizAttempt.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.certificate.count as jest.Mock).mockResolvedValue(0);
    (prisma.course.findUnique as jest.Mock).mockResolvedValue({ code: null });
    (prisma.certificate.create as jest.Mock).mockResolvedValue({});

    const result = await service.checkAndIssueCertificate(studentId, 'abcd1234-course');

    expect(result.issued).toBe(true);
    expect(result.credentialId).toMatch(/^FS-\d{4}-CRS-ABCD-001$/);
  });

  it('treats a unique-constraint race (double-click / concurrent request) as a safe no-op, not an error', async () => {
    (prisma.certificate.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.video.count as jest.Mock).mockResolvedValue(1);
    (prisma.quiz.count as jest.Mock).mockResolvedValue(0);
    (prisma.videoProgress.count as jest.Mock).mockResolvedValue(1);
    (prisma.quizAttempt.count as jest.Mock).mockResolvedValue(0);
    (prisma.quizAttempt.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.certificate.count as jest.Mock).mockResolvedValue(0);
    (prisma.course.findUnique as jest.Mock).mockResolvedValue({ code: 'FSD101' });
    (prisma.certificate.create as jest.Mock).mockRejectedValue({ code: 'P2002' });

    const result = await service.checkAndIssueCertificate(studentId, courseId);

    expect(result).toEqual({ issued: false });
  });

  it('rethrows an unrelated DB error instead of swallowing it as a race', async () => {
    (prisma.certificate.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.video.count as jest.Mock).mockResolvedValue(1);
    (prisma.quiz.count as jest.Mock).mockResolvedValue(0);
    (prisma.videoProgress.count as jest.Mock).mockResolvedValue(1);
    (prisma.quizAttempt.count as jest.Mock).mockResolvedValue(0);
    (prisma.quizAttempt.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.certificate.count as jest.Mock).mockResolvedValue(0);
    (prisma.course.findUnique as jest.Mock).mockResolvedValue({ code: 'FSD101' });
    (prisma.certificate.create as jest.Mock).mockRejectedValue(new Error('connection reset'));

    await expect(
      service.checkAndIssueCertificate(studentId, courseId),
    ).rejects.toThrow('connection reset');
  });
});
