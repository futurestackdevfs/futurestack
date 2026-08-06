import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CourseService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        trainer: {
          include: {
            _count: { select: { coursesTaught: true } },
          },
        },
        resources: true,
        sections: {
          orderBy: { order: 'asc' },
          include: {
            videos: { orderBy: { order: 'asc' } },
            quizzes: { orderBy: { order: 'asc' } },
          },
        },
        _count: { select: { enrollments: true } },
      },
    });

    if (!course) return null;

    const totalHours = Math.round(
      course.sections.reduce(
        (sum, s) =>
          sum + s.videos.reduce((vSum, v) => vSum + v.durationSeconds, 0),
        0,
      ) / 3600,
    );

    const totalVideos = course.sections.reduce(
      (sum, s) => sum + s.videos.length,
      0,
    );
    const totalQuizzes = course.sections.reduce(
      (sum, s) => sum + s.quizzes.length,
      0,
    );
    const totalLessons = totalVideos + totalQuizzes;

    return {
      id: course.id,
      title: course.title,
      description: course.description ?? '',
      thumbnailUrl: course.thumbnailUrl,
      price: course.price,
      whatYoullLearn: course.whatYoullLearn,
      techStack: course.techStack,
      careerTitle: course.careerTitle,
      careerBody: course.careerBody,
      category: course.techStack[0] ?? 'General',
      hours: totalHours || 20,
      level: 'Intermediate',
      rating: course.trainer?.rating ?? 4.7,
      students: course._count.enrollments,
      mentorInitials: (course.trainer?.name ?? 'TM')
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      mentorName: course.trainer?.name ?? 'Team',
      mentorAvatar: course.trainer?.avatarUrl,
      mentorBio: course.trainer?.bio,
      mentorYearsExp: course.trainer?.yearsExperience,
      mentorRating: course.trainer?.rating,
      mentorCoursesTaught: course.trainer?._count?.coursesTaught,
      sections: course.sections.map((s) => ({
        id: s.id,
        title: s.title,
        order: s.order,
        videos: s.videos.map((v) => ({
          id: v.id,
          title: v.title,
          vdoCipherId: v.vdoCipherId,
          durationSeconds: v.durationSeconds,
          order: v.order,
        })),
        quizzes: s.quizzes.map((q) => ({
          id: q.id,
          title: q.title,
          totalQuestions: q.totalQuestions,
          order: q.order,
        })),
      })),
      resources: course.resources.map((r) => ({
        id: r.id,
        title: r.title,
        fileType: r.fileType,
        fileUrl: r.fileUrl,
        fileSizeLabel: r.fileSizeLabel,
      })),
      totalLessons,
      totalVideos,
      totalQuizzes,
    };
  }

  async findAll() {
    const courses = await this.prisma.course.findMany({
      include: {
        trainer: true,
        sections: {
          include: { videos: true },
        },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return courses.map((course) => {
      const totalHours = Math.round(
        course.sections.reduce(
          (sum, s) =>
            sum + s.videos.reduce((vSum, v) => vSum + v.durationSeconds, 0),
          0,
        ) / 3600,
      );

      return {
        id: course.id,
        category: course.techStack[0] ?? 'General',
        title: course.title,
        description: course.description ?? '',
        hours: totalHours || 20,
        students: `${((course._count.enrollments / 1000) * 10).toFixed(1).replace('.0', '')}k`,
        level: 'Intermediate',
        rating: course.trainer?.rating ?? 4.7,
        reviews: `${course._count.enrollments}`,
        badge: 'NEW',
        badgeClass: 'bg-green-500',
        mentor: (course.trainer?.name ?? 'TM')
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
        mentorName: course.trainer?.name ?? 'Team',
        mentorColor: 'from-blue-500 to-blue-600',
        img: course.thumbnailUrl ?? '/images/C1.png',
        mode: 'Self-Paced',
        goal: 'Upskill',
        tech: course.techStack[0] ?? 'General',
        duration:
          totalHours > 50
            ? '50+ hrs'
            : totalHours > 20
              ? '20 – 50 hrs'
              : '5 – 20 hrs',
      };
    });
  }
}
