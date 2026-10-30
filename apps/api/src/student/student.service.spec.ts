import { ForbiddenException } from '@nestjs/common';
import { StudentService } from './student.service';
import { PrismaService } from '../prisma/prisma.service';
import { CertificatesService } from '../certificates/certificates.service';
import { VdoCipherService } from '../vdocipher/vdocipher.service';
import { S3Service } from '../upload/s3.service';
import { decimal } from '../test-utils/fixtures';

function setup() {
  const prisma = {
    enrollment: { findUnique: jest.fn() },
    course: { findUnique: jest.fn() },
    videoProgress: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() },
    quizAttempt: { findMany: jest.fn(), create: jest.fn() },
    video: { findUnique: jest.fn() },
    quiz: { findUnique: jest.fn() },
  } as unknown as PrismaService;

  const certificatesService = {
    checkAndIssueCertificate: jest.fn().mockResolvedValue({ issued: false }),
  } as unknown as CertificatesService;

  const vdoCipherService = {} as VdoCipherService;
  const s3Service = {} as S3Service;

  const service = new StudentService(prisma, certificatesService, vdoCipherService, s3Service);
  return { service, prisma, certificatesService };
}

describe('StudentService#getCourseDetail — curriculum locking', () => {
  const studentId = '__spec__student-1';
  const courseId = '__spec__course-node';

  function baseCourse() {
    return {
      id: courseId,
      title: '__spec__ Node.js Masterclass',
      description: 'desc',
      thumbnailUrl: null,
      price: decimal(2999),
      whatYoullLearn: [],
      techStack: [],
      careerTitle: null,
      careerBody: null,
      trainer: null,
      resources: [],
      sections: [
        {
          id: '__spec__section-1',
          title: 'Getting started',
          order: 1,
          videos: [
            { id: '__spec__video-1', title: 'Intro', order: 1, durationSeconds: 300 },
            { id: '__spec__video-2', title: 'Setup', order: 2, durationSeconds: 400 },
          ],
          quizzes: [
            { id: '__spec__quiz-1', title: 'Quiz 1', order: 3, totalQuestions: 5, passingScore: 60 },
          ],
        },
      ],
    };
  }

  it('throws Forbidden when the student has no active enrollment', async () => {
    const { service, prisma } = setup();
    (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.course.findUnique as jest.Mock).mockResolvedValue(baseCourse());

    await expect(service.getCourseDetail(studentId, courseId)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('marks only the first incomplete item as current and locks everything after it', async () => {
    const { service, prisma } = setup();
    (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue({ id: '__spec__enr-1', status: 'active' });
    (prisma.course.findUnique as jest.Mock).mockResolvedValue(baseCourse());
    (prisma.videoProgress.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.quizAttempt.findMany as jest.Mock).mockResolvedValue([]);

    const detail = await service.getCourseDetail(studentId, courseId);

    const items = detail.sections[0].items;
    expect(items[0].isCurrent).toBe(true);
    expect(items[0].isLocked).toBe(false);
    expect(items[1].isCurrent).toBe(false);
    expect(items[1].isLocked).toBe(true);
    expect(items[2].isCurrent).toBe(false);
    expect(items[2].isLocked).toBe(true);
  });

  it('advances the "current" item to the next incomplete one once earlier items are done', async () => {
    const { service, prisma } = setup();
    (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue({ id: '__spec__enr-1', status: 'active' });
    (prisma.course.findUnique as jest.Mock).mockResolvedValue(baseCourse());
    (prisma.videoProgress.findMany as jest.Mock).mockResolvedValue([
      { videoId: '__spec__video-1', isCompleted: true, score: null },
    ]);
    (prisma.quizAttempt.findMany as jest.Mock).mockResolvedValue([]);

    const detail = await service.getCourseDetail(studentId, courseId);
    const items = detail.sections[0].items;

    expect(items[0].isCompleted).toBe(true);
    expect(items[0].isLocked).toBe(false);
    expect(items[1].isCurrent).toBe(true);
    expect(items[1].isLocked).toBe(false);
    expect(items[2].isLocked).toBe(true);
    expect(detail.progress.completedItems).toBe(1);
    expect(detail.progress.totalItems).toBe(3);
  });

  it('does not lock anything once every item in the course is complete', async () => {
    const { service, prisma } = setup();
    (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue({ id: '__spec__enr-1', status: 'active' });
    (prisma.course.findUnique as jest.Mock).mockResolvedValue(baseCourse());
    (prisma.videoProgress.findMany as jest.Mock).mockResolvedValue([
      { videoId: '__spec__video-1', isCompleted: true, score: null },
      { videoId: '__spec__video-2', isCompleted: true, score: null },
    ]);
    (prisma.quizAttempt.findMany as jest.Mock).mockResolvedValue([
      { quizId: '__spec__quiz-1', isCompleted: true, score: 90 },
    ]);

    const detail = await service.getCourseDetail(studentId, courseId);
    expect(detail.sections[0].items.every((i) => !i.isLocked)).toBe(true);
    expect(detail.progress.progressPercent).toBe(100);
  });
});

describe('StudentService#updateVideoProgress — completion threshold', () => {
  const studentId = '__spec__student-1';
  const videoId = '__spec__video-1';
  const courseId = '__spec__course-node';

  function baseVideo() {
    return {
      id: videoId,
      durationSeconds: 300,
      section: { courseId, course: {} },
    };
  }

  it('does not mark a video complete when watched position is short of full duration', async () => {
    const { service, prisma, certificatesService } = setup();
    (prisma.video.findUnique as jest.Mock).mockResolvedValue(baseVideo());
    (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue({ id: '__spec__enr-1', status: 'active' });
    (prisma.videoProgress.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.videoProgress.upsert as jest.Mock).mockResolvedValue({
      videoId,
      uniqueSecsWatched: 200,
      lastPositionSec: 200,
      isCompleted: false,
      completedAt: null,
    });

    const result = await service.updateVideoProgress(studentId, videoId, 200);

    expect(result.isCompleted).toBe(false);
    expect(result.justCompleted).toBe(false);
    expect(certificatesService.checkAndIssueCertificate).not.toHaveBeenCalled();
  });

  it('marks the video complete once watched position reaches full duration, and fires the certificate check', async () => {
    const { service, prisma, certificatesService } = setup();
    (prisma.video.findUnique as jest.Mock).mockResolvedValue(baseVideo());
    (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue({ id: '__spec__enr-1', status: 'active' });
    (prisma.videoProgress.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.videoProgress.upsert as jest.Mock).mockResolvedValue({
      videoId,
      uniqueSecsWatched: 300,
      lastPositionSec: 300,
      isCompleted: true,
      completedAt: new Date(),
    });

    const result = await service.updateVideoProgress(studentId, videoId, 300);

    expect(result.isCompleted).toBe(true);
    expect(result.justCompleted).toBe(true);
    expect(certificatesService.checkAndIssueCertificate).toHaveBeenCalledWith(studentId, courseId);
  });

  it('never lets uniqueSecsWatched regress if the student rewinds and re-plays an earlier part', async () => {
    const { service, prisma } = setup();
    (prisma.video.findUnique as jest.Mock).mockResolvedValue(baseVideo());
    (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue({ id: '__spec__enr-1', status: 'active' });
    (prisma.videoProgress.findUnique as jest.Mock).mockResolvedValue({
      uniqueSecsWatched: 250,
      isCompleted: false,
    });
    (prisma.videoProgress.upsert as jest.Mock).mockResolvedValue({});

    await service.updateVideoProgress(studentId, videoId, 50); // rewound to 50s

    expect(prisma.videoProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ uniqueSecsWatched: 250 }), // kept the furthest point, not overwritten with 50
      }),
    );
  });

  it('clamps a position beyond the video length instead of storing an out-of-range value', async () => {
    const { service, prisma } = setup();
    (prisma.video.findUnique as jest.Mock).mockResolvedValue(baseVideo());
    (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue({ id: '__spec__enr-1', status: 'active' });
    (prisma.videoProgress.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.videoProgress.upsert as jest.Mock).mockResolvedValue({});

    await service.updateVideoProgress(studentId, videoId, 99999);

    expect(prisma.videoProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ uniqueSecsWatched: 300, lastPositionSec: 300 }),
      }),
    );
  });

  it('throws Forbidden if the student is not actively enrolled in the video’s course', async () => {
    const { service, prisma } = setup();
    (prisma.video.findUnique as jest.Mock).mockResolvedValue(baseVideo());
    (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue({ id: '__spec__enr-1', status: 'refunded' });

    await expect(service.updateVideoProgress(studentId, videoId, 100)).rejects.toThrow(
      ForbiddenException,
    );
  });
});

describe('StudentService#submitQuiz — server-side scoring', () => {
  const studentId = '__spec__student-1';
  const quizId = '__spec__quiz-1';
  const courseId = '__spec__course-node';

  function baseQuiz() {
    return {
      id: quizId,
      passingScore: 60,
      section: { courseId, course: {} },
      questions: [
        { id: '__spec__q1', question: 'Q1', options: ['a', 'b'], correctIndices: [0], explanation: null },
        { id: '__spec__q2', question: 'Q2', options: ['a', 'b'], correctIndices: [1], explanation: null },
      ],
    };
  }

  it('computes the score itself from correct answers and ignores any client-supplied score', async () => {
    const { service, prisma } = setup();
    (prisma.quiz.findUnique as jest.Mock).mockResolvedValue(baseQuiz());
    (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue({ id: '__spec__enr-1', status: 'active' });
    (prisma.quizAttempt.create as jest.Mock).mockImplementation(({ data }: any) => Promise.resolve({
      ...data,
      quizId,
    }));

    // Client claims a perfect score of 100, but only answers 1 of 2 correctly.
    const result = await service.submitQuiz(studentId, quizId, {
      score: 100,
      answers: [
        { questionId: '__spec__q1', selectedIndices: [0] }, // correct
        { questionId: '__spec__q2', selectedIndices: [0] }, // wrong (correctIndices is [1])
      ],
    });

    expect(result.score).toBe(50); // server-computed, not the client's claimed 100
    expect(result.correctCount).toBe(1);
    expect(result.passed).toBe(false); // 50 < passingScore 60
  });

  it('passes when the server-computed score meets the passing threshold', async () => {
    const { service, prisma } = setup();
    (prisma.quiz.findUnique as jest.Mock).mockResolvedValue(baseQuiz());
    (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue({ id: '__spec__enr-1', status: 'active' });
    (prisma.quizAttempt.create as jest.Mock).mockImplementation(({ data }: any) => Promise.resolve({
      ...data,
      quizId,
    }));

    const result = await service.submitQuiz(studentId, quizId, {
      answers: [
        { questionId: '__spec__q1', selectedIndices: [0] },
        { questionId: '__spec__q2', selectedIndices: [1] },
      ],
    });

    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it('triggers the certificate check after a course-linked quiz is submitted', async () => {
    const { service, prisma, certificatesService } = setup();
    (prisma.quiz.findUnique as jest.Mock).mockResolvedValue(baseQuiz());
    (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue({ id: '__spec__enr-1', status: 'active' });
    (prisma.quizAttempt.create as jest.Mock).mockImplementation(({ data }: any) => Promise.resolve({
      ...data,
      quizId,
    }));

    await service.submitQuiz(studentId, quizId, { answers: [] });

    expect(certificatesService.checkAndIssueCertificate).toHaveBeenCalledWith(studentId, courseId);
  });

  it('does not touch the certificate check for a standalone quiz with no section', async () => {
    const { service, prisma, certificatesService } = setup();
    (prisma.quiz.findUnique as jest.Mock).mockResolvedValue({
      ...baseQuiz(),
      section: null,
    });
    (prisma.quizAttempt.create as jest.Mock).mockImplementation(({ data }: any) => Promise.resolve({
      ...data,
      quizId,
    }));

    await service.submitQuiz(studentId, quizId, { answers: [] });

    expect(certificatesService.checkAndIssueCertificate).not.toHaveBeenCalled();
  });
});

// ── Project videos: purchase gate ─────────────────────────────────────────
// The single free preview video is served by a different, public endpoint
// (ProjectsService.getPublicCurriculumVideoOtp). Everything here is the
// logged-in, paid-content path and must require an active purchase.
describe('StudentService project videos - purchase gate', () => {
  const studentId = '__spec__student-1';
  const otherProjectId = '__spec__project-other';
  const projectId = '__spec__project-1';
  const videoId = '__spec__pvideo-1';

  function setupProjects() {
    const prisma = {
      projectCurriculumVideo: { findUnique: jest.fn() },
      projectCurriculum: { findMany: jest.fn().mockResolvedValue([]) },
      orderItem: { findFirst: jest.fn() },
      videoProgress: { findUnique: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]), upsert: jest.fn() },
      user: { findUnique: jest.fn().mockResolvedValue({ name: 'Spec Student', email: 'spec@example.com' }) },
    } as unknown as PrismaService;
    const vdoCipherService = {
      getPlaybackOtp: jest.fn().mockResolvedValue({ otp: 'otp', playbackInfo: 'info' }),
    } as unknown as VdoCipherService;
    const service = new StudentService(prisma, {} as CertificatesService, vdoCipherService, {} as S3Service);
    (prisma.projectCurriculumVideo.findUnique as jest.Mock).mockResolvedValue({
      id: videoId,
      title: 'Lesson',
      vdoCipherId: '__spec__vdo-1',
      videoStatus: 'READY',
      durationSeconds: 600,
      curriculum: { projectId, project: { id: projectId } },
    });
    return { service, prisma, vdoCipherService };
  }

  it('refuses the playback OTP to a student who has not bought the project', async () => {
    const { service, prisma, vdoCipherService } = setupProjects();
    (prisma.orderItem.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.getProjectVideoOtp(studentId, videoId)).rejects.toThrow(ForbiddenException);
    expect(vdoCipherService.getPlaybackOtp).not.toHaveBeenCalled();
  });

  it('checks for an ACTIVE order item of THIS project owned by THIS student', async () => {
    const { service, prisma } = setupProjects();
    (prisma.orderItem.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.getProjectVideoOtp(studentId, videoId)).rejects.toThrow(ForbiddenException);
    expect(prisma.orderItem.findFirst).toHaveBeenCalledWith({
      where: { projectId, status: 'active', order: { userId: studentId } },
      select: { id: true },
    });
  });

  it('issues the OTP, watermarked with the buyer, once the project is purchased', async () => {
    const { service, prisma, vdoCipherService } = setupProjects();
    (prisma.orderItem.findFirst as jest.Mock).mockResolvedValue({ id: '__spec__item-1' });

    const result = await service.getProjectVideoOtp(studentId, videoId);

    expect(result).toMatchObject({ otp: 'otp', playbackInfo: 'info', videoId });
    expect(vdoCipherService.getPlaybackOtp).toHaveBeenCalledWith('__spec__vdo-1', {
      name: 'Spec Student',
      email: 'spec@example.com',
    });
  });

  it('refuses to record progress on a project video the student has not bought', async () => {
    const { service, prisma } = setupProjects();
    (prisma.orderItem.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.updateProjectVideoProgress(studentId, videoId, 100)).rejects.toThrow(ForbiddenException);
    expect(prisma.videoProgress.upsert).not.toHaveBeenCalled();
  });

  it('refuses the project progress/curriculum listing to a non-purchaser, for any project id', async () => {
    const { service, prisma } = setupProjects();
    (prisma.orderItem.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.getProjectProgress(studentId, otherProjectId)).rejects.toThrow(ForbiddenException);
    expect(prisma.projectCurriculum.findMany).not.toHaveBeenCalled();
  });

  it('allows progress and the curriculum listing for a purchaser', async () => {
    const { service, prisma } = setupProjects();
    (prisma.orderItem.findFirst as jest.Mock).mockResolvedValue({ id: '__spec__item-1' });
    (prisma.videoProgress.upsert as jest.Mock).mockResolvedValue({
      projectCurriculumVideoId: videoId,
      uniqueSecsWatched: 100,
      lastPositionSec: 100,
      isCompleted: false,
      completedAt: null,
    });

    await expect(service.updateProjectVideoProgress(studentId, videoId, 100)).resolves.toMatchObject({ videoId });
    await expect(service.getProjectProgress(studentId, projectId)).resolves.toBeDefined();
  });
});
