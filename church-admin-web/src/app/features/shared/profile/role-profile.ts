import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/service/auth.service';

@Component({
  selector: 'app-role-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './role-profile.html',
  styleUrl: './role-profile.scss',
})
export class RoleProfile {
  private readonly authService = inject(AuthService);

  readonly user = this.authService.getCurrentUser();
  readonly membership = this.authService.getActiveMembership();
  readonly activeRole = this.authService.getActiveChurchRole();

  get userInitials(): string {
    const name = this.user?.fullName?.trim() || 'User';

    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  get dashboardRoute(): string {
    return this.authService.getRouteForChurchRole(this.activeRole || '');
  }

  formatRole(role: string): string {
    return role
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
