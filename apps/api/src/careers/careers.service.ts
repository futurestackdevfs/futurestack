import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobPostingDto } from './dto/create-job-posting.dto';
import { UpdateJobPostingDto } from './dto/update-job-posting.dto';

@Injectable()
export class CareersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.jobPosting.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(dto: CreateJobPostingDto) {
    return this.prisma.jobPosting.create({
      data: {
        title: dto.title,
        duration: dto.duration,
        description: dto.description ?? null,
        requirements: dto.requirements ?? null,
        skills: dto.skills ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateJobPostingDto) {
    const existing = await this.prisma.jobPosting.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Job posting with id "${id}" not found`);
    }
    return this.prisma.jobPosting.update({
      where: { id },
      data: {
        title: dto.title,
        duration: dto.duration,
        description: dto.description === undefined ? undefined : dto.description.trim() || null,
        requirements: dto.requirements === undefined ? undefined : dto.requirements.trim() || null,
        skills: dto.skills === undefined ? undefined : dto.skills.trim() || null,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.jobPosting.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Job posting with id "${id}" not found`);
    }
    return this.prisma.jobPosting.delete({ where: { id } });
  }
}
