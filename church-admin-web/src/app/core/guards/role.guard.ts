
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../service/auth.service';

export function roleGuard(requiredRole: string): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const user = authService.getCurrentUser();

    if (!user || !authService.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }

    const isPlatformAdmin = authService.isPlatformAdmin(user);

    // Platform access is separate from every church membership role.
    if (requiredRole === 'super_admin') {
      return isPlatformAdmin
        ? true
        : router.createUrlTree([authService.getInitialRoute()]);
    }

    if (isPlatformAdmin) {
      authService.clearActiveContext();
      return router.createUrlTree(['/platform-admin/dashboard']);
    }

    const membership = authService.getActiveMembership();
    const activeRole = authService.getActiveChurchRole();

    if (
      membership &&
      activeRole === requiredRole &&
      membership.roles.includes(requiredRole)
    ) {
      return true;
    }

    return router.createUrlTree(['/select-context']);
  };
}
