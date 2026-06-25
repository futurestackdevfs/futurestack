import { applyDecorators, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';

/**
 * Shortcut combining JwtAuthGuard + RolesGuard + @Roles() in one decorator.
 *
 * Usage:
 *   @Auth()                          → any authenticated user, any role
 *   @Auth(Role.ADMIN)                → admin only
 *   @Auth(Role.ADMIN, Role.COORDINATOR)  → either role
 */
export function Auth(...roles: Role[]) {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...roles),
  );
}