import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CoursesService } from './courses.service';
import { PrismaService } from '../prisma/prisma.service';
import { decimal } from '../test-utils/fixtures';

// Every Prisma call goes through this mock — no live DB connection is ever
// opened. VdoCipherService and S3Service are mocked stubs too, so no real
// external video/storage API is touched either.
function makePrismaMock() {
  return {
    course: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    track: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    section: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    video: {
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    quiz: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    quizQuestion: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    trackCourse: {
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      upsert: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    enrollment: { count: jest.fn() },
    courseResource: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn(),
  } as unknown as PrismaService;
}

function makeVdoCipherMock() {
  return { deleteVideo: jest.fn(), getPlaybackOtp: jest.fn() } as any;
}

function makeS3Mock() {
  return { deleteByUrl: jest.fn() } as any;
}

describe('CoursesService', () => {
  let service: CoursesService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new CoursesService(prisma, makeVdoCipherMock(), makeS3Mock());
  });

  describe('createCourse()', () => {
    it('creates a course with a generated code when none is given', async () => {
      (prisma.course.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // title uniqueness check
        .mockResolvedValueOnce(null); // last code lookup via findFirst below is separate
      (prisma.course.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.course.create as jest.Mock).mockResolvedValue({ id: '__spec__course-1' });

      const result = await service.createCourse({
        title: '__spec__ New Course',
        price: 999,
      } as any);

      expect(prisma.course.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ code: expect.stringMatching(/^CRS-/) }),
        }),
      );
      expect(result).toEqual({ id: '__spec__course-1' });
    });

    it('rejects a duplicate course title', async () => {
      (prisma.course.findUnique as jest.Mock).mockResolvedValue({ id: '__spec__existing' });

      await expect(
        service.createCourse({ title: '__spec__ Existing Course', price: 100 } as any),
      ).rejects.toThrow(ConflictException);
      expect(prisma.course.create).not.toHaveBeenCalled();
    });

    it('rejects assigning a trainerId that does not belong to an approved trainer', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: Role.TRAINER,
        approvalStatus: 'PENDING',
      });

      await expect(
        service.createCourse({
          title: '__spec__ Course',
          price: 100,
          trainerId: '__spec__trainer-1',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects assigning a trainerId that belongs to a non-trainer user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: Role.STUDENT,
        approvalStatus: null,
      });

      await expect(
        service.createCourse({
          title: '__spec__ Course',
          price: 100,
          trainerId: '__spec__student-1',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteCourse()', () => {
    it('rejects deleting a course with active enrollments', async () => {
      (prisma.course.findUnique as jest.Mock).mockResolvedValue({ id: '__spec__course-1' });
      (prisma.enrollment.count as jest.Mock).mockResolvedValue(5);

      await expect(service.deleteCourse('__spec__course-1')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.course.delete).not.toHaveBeenCalled();
    });

    it('deletes a course with no active enrollments', async () => {
      (prisma.course.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__course-1',
        thumbnailUrl: null,
      });
      (prisma.enrollment.count as jest.Mock).mockResolvedValue(0);
      (prisma.course.delete as jest.Mock).mockResolvedValue({});

      const result = await service.deleteCourse('__spec__course-1');
      expect(result.message).toBe('Course deleted');
    });

    it('rejects deleting a course that does not exist', async () => {
      (prisma.course.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteCourse('__spec__missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Quiz — standalone vs course-linked distinction', () => {
    it('createQuiz() attaches the quiz to the given sectionId', async () => {
      (prisma.section.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__section-1',
        courseId: '__spec__course-1',
      });
      (prisma.quiz.create as jest.Mock).mockResolvedValue({
        id: '__spec__quiz-1',
        sectionId: '__spec__section-1',
      });

      await service.createQuiz('__spec__section-1', {
        title: '__spec__ Quiz',
      } as any);

      expect(prisma.quiz.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sectionId: '__spec__section-1',
          totalQuestions: 0,
        }),
      });
    });

    it('createStandaloneQuiz() creates a quiz with sectionId explicitly null', async () => {
      (prisma.quiz.create as jest.Mock).mockResolvedValue({
        id: '__spec__quiz-2',
        sectionId: null,
      });

      await service.createStandaloneQuiz({ title: '__spec__ Standalone Quiz' } as any);

      expect(prisma.quiz.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ sectionId: null, totalQuestions: 0 }),
      });
      // Never touches Section — a standalone quiz has no section to validate.
      expect(prisma.section.findUnique).not.toHaveBeenCalled();
    });

    it('listStandaloneQuizzes() only queries quizzes where sectionId is null', async () => {
      (prisma.quiz.findMany as jest.Mock).mockResolvedValue([]);

      await service.listStandaloneQuizzes();

      expect(prisma.quiz.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { sectionId: null } }),
      );
    });

    it('updateQuiz() strips sectionId out of the update payload (immutable once created)', async () => {
      (prisma.quiz.findUnique as jest.Mock).mockResolvedValue({ id: '__spec__quiz-1' });
      (prisma.quiz.update as jest.Mock).mockResolvedValue({});

      await service.updateQuiz('__spec__quiz-1', {
        title: '__spec__ Renamed',
        sectionId: '__spec__section-should-be-ignored',
      } as any);

      const callArgs = (prisma.quiz.update as jest.Mock).mock.calls[0][0];
      expect(callArgs.data).not.toHaveProperty('sectionId');
    });
  });

  describe('createVideo() — first video becomes the public preview', () => {
    it('marks the very first video of a course as isPreview true', async () => {
      (prisma.section.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__section-1',
        courseId: '__spec__course-1',
      });
      (prisma.video.count as jest.Mock).mockResolvedValue(0);
      (prisma.video.create as jest.Mock).mockResolvedValue({});

      await service.createVideo('__spec__section-1', { title: '__spec__ Video' } as any);

      expect(prisma.video.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isPreview: true }),
      });
    });

    it('marks every subsequent video as locked (isPreview false)', async () => {
      (prisma.section.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__section-1',
        courseId: '__spec__course-1',
      });
      (prisma.video.count as jest.Mock).mockResolvedValue(3);
      (prisma.video.create as jest.Mock).mockResolvedValue({});

      await service.createVideo('__spec__section-1', { title: '__spec__ Video 4' } as any);

      expect(prisma.video.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isPreview: false }),
      });
    });
  });

  describe('deleteTrack()', () => {
    it('rejects deleting a track that still has linked courses', async () => {
      (prisma.track.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__track-1',
        _count: { courses: 2 },
      });

      await expect(service.deleteTrack('__spec__track-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('deletes a track with no linked courses', async () => {
      (prisma.track.findUnique as jest.Mock).mockResolvedValue({
        id: '__spec__track-1',
        _count: { courses: 0 },
      });
      (prisma.track.delete as jest.Mock).mockResolvedValue({});

      const result = await service.deleteTrack('__spec__track-1');
      expect(result.message).toBe('Track deleted');
    });
  });

  describe('linkCourseToTrack() / unlinkCourseFromTrack()', () => {
    it('rejects linking a course that is already linked to the track', async () => {
      (prisma.course.findUnique as jest.Mock).mockResolvedValue({ id: '__spec__course-1' });
      (prisma.track.findUnique as jest.Mock).mockResolvedValue({ id: '__spec__track-1' });
      (prisma.trackCourse.create as jest.Mock).mockRejectedValue({ code: 'P2002' });

      await expect(
        service.linkCourseToTrack('__spec__course-1', '__spec__track-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('reports 404 when unlinking a course that was never linked', async () => {
      (prisma.trackCourse.delete as jest.Mock).mockRejectedValue({ code: 'P2025' });

      await expect(
        service.unlinkCourseFromTrack('__spec__course-1', '__spec__track-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('publicCourseDetail()', () => {
    it('throws 404 for a course that is not ACTIVE (or missing)', async () => {
      (prisma.course.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.publicCourseDetail('__spec__course-x')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('converts Decimal price fields to plain numbers in the response', async () => {
      (prisma.course.findFirst as jest.Mock).mockResolvedValue({
        id: '__spec__course-1',
        title: '__spec__ React Deep Dive',
        description: 'desc',
        thumbnailUrl: null,
        price: decimal(4999),
        originalPrice: decimal(6999),
        whatYoullLearn: [],
        techStack: ['React'],
        careerTitle: null,
        careerBody: null,
        category: null,
        skillLevel: 'INTERMEDIATE',
        trainer: null,
        sections: [],
        _count: { enrollments: 10 },
      });

      const result = await service.publicCourseDetail('__spec__course-1');

      expect(result.price).toBe(4999);
      expect(typeof result.price).toBe('number');
      expect(result.originalPrice).toBe(6999);
      expect(result.hasDiscount).toBe(true);
    });
  });
});
