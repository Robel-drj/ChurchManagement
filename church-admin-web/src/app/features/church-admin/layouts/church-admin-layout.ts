import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';

import { AuthService } from '../../../core/service/auth.service';

@Component({
  selector: 'app-church-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './church-admin-layout.html',
  styleUrl: './church-admin-layout.scss',
})
export class ChurchAdminLayout {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = this.authService.getCurrentUser();
  readonly canSwitchWorkspace = this.authService.hasMultipleWorkspaces(
    this.user
  );

  sidebarOpen = false;

  menuGroups = [
    {
      title: 'MAIN MENU',
      items: [
        {
          label: 'Dashboard',
          icon: '⌂',
          route: '/church-admin/dashboard',
        },
      ],
    },
    {
      title: 'CHURCH MANAGEMENT',
      items: [
        {
          label: 'Members',
          icon: '♙',
          route: '/church-admin/members',
        },
        {
          label: 'Staff & Roles',
          icon: '♟',
          route: '/church-admin/staff',
        },
        {
          label: 'Church Profile',
          icon: '▣',
          route: '/church-admin/profile',
        },
      ],
    },
    {
      title: 'FINANCE',
      items: [
        {
          label: 'Contributions',
          icon: '◈',
          route: '/church-admin/finance/contributions',
        },
        {
          label: 'Categories',
          icon: '☷',
          route: '/church-admin/finance/categories',
        },
        {
          label: 'Payment Methods',
          icon: '▤',
          route: '/church-admin/finance/payment-methods',
        },
        {
          label: 'Adjustments',
          icon: '↔',
          route: '/church-admin/finance/adjustments',
        },
        {
          label: 'Financial Reports',
          icon: '▥',
          route: '/church-admin/finance/reports',
        },
      ],
    },
    {
      title: 'CONTENT & ACTIVITIES',
      items: [
        {
          label: 'Posts & Content',
          icon: '▤',
          route: '/church-admin/content',
        },
        {
          label: 'Events',
          icon: '▦',
          route: '/church-admin/events',
        },
        {
          label: 'Notifications',
          icon: '♢',
          route: '/church-admin/notifications',
        },
        {
          label: 'Media Library',
          icon: '▧',
          route: '/church-admin/media',
        },
      ],
    },
    {
      title: 'INSIGHTS',
      items: [
        {
          label: 'Reports',
          icon: '▥',
          route: '/church-admin/reports',
        },
      ],
    },
  ];

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  get userInitials(): string {
    const name = this.user?.fullName?.trim() || 'Church Admin';

    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }
}
