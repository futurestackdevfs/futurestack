import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Must run AFTER JwtAuthGuard — it relies on req.user already being
 * populated by JwtStrategy. Order matters:
 *   @UseGuards(JwtAuthGuard, RolesGuard)   ✅ correct order
 *   @UseGuards(RolesGuard, JwtAuthGuard)   ❌ req.user won't exist yet
 *
 * If a route has no @Roles() decorator at all, this guard allows access
 * to any authenticated user (role-agnostic — JwtAuthGuard alone already
 * handles "must be logged in").
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user?.role);
  }
}