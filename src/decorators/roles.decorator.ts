import { UserRole } from '@app/generated/prisma/enums';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const AdminOnly = () => SetMetadata(ROLES_KEY, [UserRole.ADMIN]);
