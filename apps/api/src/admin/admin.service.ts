import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listAllTrainers() {
    const trainers = await this.prisma.user.findMany({
      where: { role: Role.TRAINER },
      select: {
        id: true, name: true, email: true, bio: true,
        yearsExperience: true, rating: true, avatarUrl: true,
        approvalStatus: true, isActive: true, createdAt: true,
        _count: { select: { coursesTaught: true, enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return trainers.map((t) => ({
      id: t.id, name: t.name, email: t.email, bio: t.bio,
      yearsExperience: t.yearsExperience, rating: t.rating,
      avatarUrl: t.avatarUrl, approvalStatus: t.approvalStatus ?? 'PENDING',
      isActive: t.isActive, createdAt: t.createdAt,
      coursesTaught: t._count.coursesTaught, totalStudents: t._count.enrollments,
    }));
  }

  async listPendingTrainers() {
    const trainers = await this.prisma.user.findMany({
      where: { role: Role.TRAINER, approvalStatus: 'PENDING' },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        yearsExperience: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' }, // oldest applications first
    });

    return trainers;
  }

  async approveTrainer(trainerId: string) {
    const trainer = await this.findPendingTrainer(trainerId);

    const updated = await this.prisma.user.update({
      where: { id: trainer.id },
      data: { approvalStatus: 'APPROVED' },
    });

    return {
      message: `${updated.name} has been approved as a trainer.`,
      trainerId: updated.id,
    };
  }

  async rejectTrainer(trainerId: string, _reason?: string) {
    const trainer = await this.findPendingTrainer(trainerId);

    const updated = await this.prisma.user.update({
      where: { id: trainer.id },
      data: { approvalStatus: 'REJECTED' },
    });

    // TODO: once a notification system exists, email the trainer with
    // the rejection reason instead of silently dropping it.

    return {
      message: `${updated.name}'s trainer application has been rejected.`,
      trainerId: updated.id,
    };
  }

  private async findPendingTrainer(trainerId: string) {
    const trainer = await this.prisma.user.findUnique({ where: { id: trainerId } });

    if (!trainer || trainer.role !== Role.TRAINER) {
      throw new NotFoundException('Trainer not found');
    }

    if (trainer.approvalStatus === 'APPROVED' || trainer.approvalStatus === 'REJECTED') {
      throw new ConflictException(
        `This trainer's application has already been ${trainer.approvalStatus.toLowerCase()}`,
      );
    }

    return trainer;
  }

  async listApprovedTrainers() {
    return this.prisma.user.findMany({
      where: { role: Role.TRAINER, approvalStatus: 'APPROVED' },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        yearsExperience: true,
        rating: true,
        avatarUrl: true,
        createdAt: true,
        _count: { select: { coursesTaught: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getPlatformStats() {
    const [
      totalCourses,
      activeCourses,
      draftCourses,
      totalTracks,
      totalTrainers,
      pendingTrainers,
      totalStudents,
      totalEnrollments,
      activeEnrollments,
    ] = await this.prisma.$transaction([
      this.prisma.course.count(),
      this.prisma.course.count({ where: { status: 'ACTIVE' } }),
      this.prisma.course.count({ where: { status: 'DRAFT' } }),
      this.prisma.track.count(),
      this.prisma.user.count({ where: { role: Role.TRAINER, approvalStatus: 'APPROVED' } }),
      this.prisma.user.count({ where: { role: Role.TRAINER, approvalStatus: 'PENDING' } }),
      this.prisma.user.count({ where: { role: Role.STUDENT } }),
      this.prisma.enrollment.count(),
      this.prisma.enrollment.count({ where: { status: 'active' } }),
    ]);

    return {
      totalCourses,
      activeCourses,
      draftCourses,
      totalTracks,
      totalTrainers,
      pendingTrainers,
      totalStudents,
      totalEnrollments,
      activeEnrollments,
    };
  }

  /**
   * Admin directly creates a Coordinator, Support, or Admin account.
   * Unlike trainer self-registration, this account is immediately usable —
   * the admin has already vetted the person by choosing to create it.
   */
  async createStaffAccount(dto: CreateStaffDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashedPassword,
        role: dto.role as Role,
        // Admin-created trainers are pre-approved — no pending review needed
        ...(dto.role === 'TRAINER' && { approvalStatus: 'APPROVED' }),
      },
    });

    return {
      message: `${user.name} has been created as ${dto.role}.`,
      userId: user.id,
    };
  }
}