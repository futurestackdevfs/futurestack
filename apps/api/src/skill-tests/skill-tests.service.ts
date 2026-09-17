import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSkillTestDto } from './dto/create-skill-test.dto';
import { UpdateSkillTestDto } from './dto/update-skill-test.dto';
import { CreateSkillTestQuestionDto } from './dto/create-skill-test-question.dto';
import { UpdateSkillTestQuestionDto } from './dto/update-skill-test-question.dto';
import { SubmitSkillTestDto } from './dto/submit-skill-test.dto';

@Injectable()
export class SkillTestsService {
  constructor(private readonly prisma: PrismaService) {}

  // ================================================================
  // ADMIN / CONTENT-MANAGER
  // ================================================================

  async listAll() {
    const tests = await this.prisma.skillTest.findMany({
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      include: { _count: { select: { questions: true, attempts: true } } },
    });
    return tests.map((t) => ({
      ...t,
      questionCount: t._count.questions,
      attemptCount: t._count.attempts,
      _count: undefined,
    }));
  }

  async getOne(id: string) {
    const test = await this.prisma.skillTest.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!test) throw new NotFoundException('Skill test not found');
    return test;
  }

  create(dto: CreateSkillTestDto) {
    return this.prisma.skillTest.create({ data: dto });
  }

  async update(id: string, dto: UpdateSkillTestDto) {
    await this.getOne(id);
    return this.prisma.skillTest.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.getOne(id);
    await this.prisma.skillTest.delete({ where: { id } });
    return { success: true };
  }

  async addQuestion(skillTestId: string, dto: CreateSkillTestQuestionDto) {
    await this.getOne(skillTestId);
    return this.prisma.skillTestQuestion.create({
      data: { ...dto, skillTestId },
    });
  }

  async updateQuestion(id: string, dto: UpdateSkillTestQuestionDto) {
    const question = await this.prisma.skillTestQuestion.findUnique({
      where: { id },
    });
    if (!question) throw new NotFoundException('Question not found');
    return this.prisma.skillTestQuestion.update({ where: { id }, data: dto });
  }

  async deleteQuestion(id: string) {
    const question = await this.prisma.skillTestQuestion.findUnique({
      where: { id },
    });
    if (!question) throw new NotFoundException('Question not found');
    await this.prisma.skillTestQuestion.delete({ where: { id } });
    return { success: true };
  }

  // ================================================================
  // PUBLIC / STUDENT
  // ================================================================

  async getByCourse(courseId: string) {
    const test = await this.prisma.skillTest.findFirst({
      where: { courseId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    return test;
  }

  async getOrCreateByCourse(courseId: string, defaultTitle: string) {
    const existing = await this.prisma.skillTest.findFirst({
      where: { courseId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (existing) return existing;
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    const created = await this.prisma.skillTest.create({
      data: { title: defaultTitle, courseId, status: 'DRAFT' },
    });
    return { ...created, questions: [] };
  }

  async listActive() {
    const tests = await this.prisma.skillTest.findMany({
      where: { status: 'ACTIVE', courseId: null },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      include: { _count: { select: { questions: true } } },
    });
    return tests.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      category: t.category,
      skillLevel: t.skillLevel,
      durationMinutes: t.durationMinutes,
      passingScore: t.passingScore,
      isFeatured: t.isFeatured,
      questionCount: t._count.questions,
    }));
  }

  async getForAttempt(id: string) {
    const test = await this.prisma.skillTest.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!test || test.status !== 'ACTIVE') {
      throw new NotFoundException('Skill test not found');
    }
    return {
      id: test.id,
      title: test.title,
      description: test.description,
      category: test.category,
      skillLevel: test.skillLevel,
      durationMinutes: test.durationMinutes,
      passingScore: test.passingScore,
      questions: test.questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        order: q.order,
      })),
    };
  }

  async submit(studentId: string, skillTestId: string, dto: SubmitSkillTestDto) {
    const test = await this.prisma.skillTest.findUnique({
      where: { id: skillTestId },
      include: { questions: true },
    });
    if (!test || test.status !== 'ACTIVE') {
      throw new NotFoundException('Skill test not found');
    }

    const answerMap = new Map(dto.answers.map((a) => [a.questionId, a.selectedIndex]));
    let correctCount = 0;
    const breakdown = test.questions
      .sort((a, b) => a.order - b.order)
      .map((q) => {
        const selectedIndex = answerMap.has(q.id) ? answerMap.get(q.id)! : -1;
        const isCorrect = selectedIndex === q.correctIndex;
        if (isCorrect) correctCount += 1;
        return {
          questionId: q.id,
          question: q.question,
          options: q.options,
          selectedIndex,
          correctIndex: q.correctIndex,
          isCorrect,
          explanation: q.explanation,
        };
      });

    const totalQuestions = test.questions.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const isPassed = test.passingScore != null ? score >= test.passingScore : true;

    const attempt = await this.prisma.skillTestAttempt.create({
      data: {
        studentId,
        skillTestId,
        score,
        totalQuestions,
        correctCount,
        isPassed,
        answers: dto.answers as any,
      },
    });

    return {
      attemptId: attempt.id,
      score,
      totalQuestions,
      correctCount,
      isPassed,
      passingScore: test.passingScore,
      breakdown,
    };
  }

  async myAttempts(studentId: string) {
    const attempts = await this.prisma.skillTestAttempt.findMany({
      where: { studentId },
      orderBy: { completedAt: 'desc' },
      include: { skillTest: { select: { title: true, category: true } } },
    });
    return attempts.map((a) => ({
      id: a.id,
      skillTestId: a.skillTestId,
      title: a.skillTest.title,
      category: a.skillTest.category,
      score: a.score,
      totalQuestions: a.totalQuestions,
      correctCount: a.correctCount,
      isPassed: a.isPassed,
      completedAt: a.completedAt,
    }));
  }
}
