import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello() {
    return this.appService.getHello();
  }

  // Pinged by Render's health check + the admin System Health view — kept
  // unauthenticated and unthrottled since Render polls it every few seconds.
  @Get('healthz')
  @SkipThrottle()
  async healthz(@Res() res: Response) {
    const startedAt = Date.now();
    let dbOk = true;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbOk = false;
    }
    res.status(dbOk ? 200 : 503).json({
      status: dbOk ? 'ok' : 'degraded',
      dbOk,
      dbLatencyMs: Date.now() - startedAt,
      uptimeSec: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  }
}
