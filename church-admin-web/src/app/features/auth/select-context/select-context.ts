
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  AuthService,
  ChurchMembership,
} from '../../../core/service/auth.service';

@Component({
  selector: 'app-select-context',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './select-context.html',
  styleUrl: './select-context.scss',
})
export class SelectContext {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = this.authService.getCurrentUser();
  readonly hasPlatformWorkspace =
    this.authService.isPlatformAdmin(this.user);
  readonly churchMemberships = this.hasPlatformWorkspace
    ? []
    : (this.user?.memberships ?? []);

  choosePlatformContext(): void {
    this.authService.clearActiveContext();
    void this.router.navigateByUrl('/platform-admin/dashboard');
  }

  chooseContext(membership: ChurchMembership, role: string): void {
    if (!this.authService.isChurchDashboardRole(role)) {
      return;
    }

    this.authService.setActiveContext(membership.membershipId, role);

    const destination = this.authService.getRouteForChurchRole(role);

    void this.router.navigateByUrl(destination);
  }

  isDashboardRole(role: string): boolean {
    return this.authService.isChurchDashboardRole(role);
  }

  hasDashboardRole(membership: ChurchMembership): boolean {
    return membership.roles.some((role) => this.isDashboardRole(role));
  }

  formatRole(role: string): string {
    return role
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }
}
