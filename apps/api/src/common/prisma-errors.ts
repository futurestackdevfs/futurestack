import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const KnownRequestError = Prisma.PrismaClientKnownRequestError;

/**
 * Translate known Prisma write errors into meaningful NestJS HTTP exceptions so
 * raw Prisma errors never leak to the client as an unhandled 500.
 *
 * - P2002 (unique constraint violation) -> ConflictException
 * - P2025 (record not found / op on missing row) -> NotFoundException
 */
export function translatePrismaError(
  error: unknown,
  messages?: { onConflict?: string; onNotFound?: string },
): never {
  if (error instanceof KnownRequestError) {
    switch (error.code) {
      case 'P2002':
        throw new ConflictException(
          messages?.onConflict ?? 'A record with this value already exists',
        );
      case 'P2025':
        throw new NotFoundException(messages?.onNotFound ?? 'Record not found');
    }
  }
  throw error;
}
