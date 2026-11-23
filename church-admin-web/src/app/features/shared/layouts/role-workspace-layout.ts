import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  ActivatedRoute,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';

import { AuthService } from '../../../core/service/auth.service';

type WorkspaceRole = 'money_collector' | 'secretary' | 'content_creator';

interface WorkspaceNavigationItem {
  label: string;
  icon: string;
  route: string;
}

interface WorkspaceConfig {
  role: WorkspaceRole;
  roleLabel: string;
  title: string;
  description: string;
  icon: string;
  accent: string;
  dashboardRoute: string;
  profileRoute: string;
  navigation: WorkspaceNavigationItem[];
}

const WORKSPACES: Record<WorkspaceRole, WorkspaceConfig> = {
  money_collector: {
    role: 'money_collector',
    roleLabel: 'Money Collector',
    title: 'Finance Workspace',
    description: 'Collections and financial reporting',
    icon: '◈',
    accent: '#0f766e',
    dashboardRoute: '/money-collector/dashboard',
    profileRoute: '/money-collector/profile',
    navigation: [
      {
        label: 'Dashboard',
        icon: '⌂',
        route: '/money-collector/dashboard',
      },
      {
        label: 'Contributions',
        icon: '◈',
        route: '/money-collector/contributions',
      },
      {
        label: 'My Profile',
        icon: '◎',
        route: '/money-collector/profile',
      },
    ],
  },
  secretary: {
    role: 'secretary',
    roleLabel: 'Secretary',
    title: 'Secretary Workspace',
    description: 'Membership records and administration',
    icon: '▤',
    accent: '#7c3aed',
    dashboardRoute: '/secretary/dashboard',
    profileRoute: '/secretary/profile',
    navigation: [
      {
        label: 'Dashboard',
        icon: '⌂',
        route: '/secretary/dashboard',
      },
      {
        label: 'Members',
        icon: '♙',
        route: '/secretary/members',
      },
      {
        label: 'My Profile',
        icon: '◎',
        route: '/secretary/profile',
      },
    ],
  },
  content_creator: {
    role: 'content_creator',
    roleLabel: 'Content Creator',
    title: 'Content Workspace',
    description: 'Posts, events, and media',
    icon: '✎',
    accent: '#4f46e5',
    dashboardRoute: '/content-creator/dashboard',
    profileRoute: '/content-creator/profile',
    navigation: [
      {
        label: 'Dashboard',
        icon: '⌂',
        route: '/content-creator/dashboard',
      },
      {
        label: 'Posts & Content',
        icon: '▤',
        route: '/content-creator/posts',
      },
      {
        label: 'Events',
        icon: '▦',
        route: '/content-creator/events',
      },
      {
        label: 'Media Library',
        icon: '▧',
        route: '/content-creator/media',
      },
      {
        label: 'My Profile',
        icon: '◎',
        route: '/content-creator/profile',
      },
    ],
  },
};

@Component({
  selector: 'app-role-workspace-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './role-workspace-layout.html',
  styleUrl: './role-workspace-layout.scss',
})
export class RoleWorkspaceLayout {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  readonly user = this.authService.getCurrentUser();
  readonly membership = this.authService.getActiveMembership();
  readonly config: WorkspaceConfig;

  sidebarOpen = false;

  constructor() {
    const workspaceRole = this.route.snapshot.data[
      'workspaceRole'
    ] as WorkspaceRole;

    this.config = WORKSPACES[workspaceRole] ?? WORKSPACES.secretary;
  }

  get userInitials(): string {
    const name = this.user?.fullName?.trim() || 'User';

    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }
}
