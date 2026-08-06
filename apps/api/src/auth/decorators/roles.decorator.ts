import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Marks a route as requiring one of the given roles.
 * Must be paired with RolesGuard (see guards/roles.guard.ts) to actually
 * be enforced — this decorator only attaches metadata, it does nothing
 * on its own.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles(Role.ADMIN, Role.COORDINATOR)
 *   @Get('some-ops-route')
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
