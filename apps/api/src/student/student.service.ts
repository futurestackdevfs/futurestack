import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface NextVideo {
  id: string;
  title: string;
  sectionTitle: string;
}

export interface CourseProgress {
  courseId: string;
  title: string;
  thumbnailUrl: string | null;
  progressPercent: number;
  completedVideos: number;
  totalVideos: number;
  hoursRemaining: number;
  nextVideo: NextVideo | null;
}

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(studentId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: studentId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId, status: 'active' },
      include: {
        course: {
          include: {
            sections: {
              orderBy: { order: 'asc' },
              include: {
                videos: { orderBy: { order: 'asc' } },
              },
            },
          },
        },
      },
    });

    // Fetch all of this student's video progress once, rather than
    // per-enrollment, to avoid N+1 queries.
    const allProgress = await this.prisma.videoProgress.findMany({
      where: { studentId },
    });
    const progressByVideoId = new Map(allProgress.map((p) => [p.videoId, p]));

    const enrolledCourses: CourseProgress[] = enrollments.map((enrollment) => {
      const course = enrollment.course;

      // Flatten sections → videos, keeping section title for "next video" display.
      // Order matters here — it's how we determine which video is "next"
      // under the strictly-sequential video rule.
      const orderedVideos = course.sections.flatMap((section) =>
        section.videos.map((video) => ({
          id: video.id,
          title: video.title,
          durationSeconds: video.durationSeconds,
          sectionTitle: section.title,
        })),
      );

      const totalVideos = orderedVideos.length;

      let completedVideos = 0;
      let secondsRemaining = 0;
      let nextVideo: NextVideo | null = null;

      for (const video of orderedVideos) {
        const progress = progressByVideoId.get(video.id);
        const isCompleted = progress?.isCompleted ?? false;

        if (isCompleted) {
          completedVideos += 1;
        } else {
          secondsRemaining += video.durationSeconds;
          // First incomplete video in sequence order is "next" —
          // matches the strictly-sequential unlock rule.
          if (!nextVideo) {
            nextVideo = {
              id: video.id,
              title: video.title,
              sectionTitle: video.sectionTitle,
            };
          }
        }
      }

      const progressPercent =
        totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;
      const hoursRemaining = Math.round((secondsRemaining / 3600) * 10) / 10;

      return {
        courseId: course.id,
        title: course.title,
        thumbnailUrl: course.thumbnailUrl,
        progressPercent,
        completedVideos,
        totalVideos,
        hoursRemaining,
        nextVideo,
      };
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      enrolledCourses,
    };
  }
}