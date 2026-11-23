import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { AuditLogs } from './features/platform-admin/audit-logs/audit-logs';
import { ChurchAdminLayout } from './features/church-admin/layouts/church-admin-layout';

export const routes: Routes = [
  {
    path: 'login',
    component: Login,
  },
  {
    path: 'accept-invitation',
    loadComponent: () =>
      import('./features/auth/accept-invitation/accept-invitation')
        .then((m) => m.AcceptInvitation),
  },

  // ---------------------------------------
  // AUTHENTICATION AND CONTEXT
  // ---------------------------------------

  {
    path: 'select-context',
    loadComponent: () =>
      import('./features/auth/select-context/select-context')
        .then((m) => m.SelectContext),
    canActivate: [authGuard],
  },

  {
    path: 'no-access',
    loadComponent: () =>
      import('./features/auth/no-access/no-access')
        .then((m) => m.NoAccess),
    canActivate: [authGuard],
  },

  // ---------------------------------------
  // PLATFORM ADMINISTRATION
  // ---------------------------------------

  {
    path: 'platform-admin/dashboard',
    loadComponent: () =>
      import('./features/platform-admin/dashboard/dashboard')
        .then((m) => m.Dashboard),
    canActivate: [authGuard, roleGuard('super_admin')],
  },

  {
    path: 'platform-admin/audit-logs',
    component: AuditLogs,
    canActivate: [authGuard, roleGuard('super_admin')],
  },

  {
    path: 'platform-admin/churches/new',
    loadComponent: () =>
      import('./features/platform-admin/dashboard/church-form/ChurchForm')
        .then((m) => m.ChurchForm),
    canActivate: [authGuard, roleGuard('super_admin')],
  },

  {
    path: 'platform-admin/churches',
    loadComponent: () =>
      import('./features/platform-admin/dashboard/churches/churches')
        .then((m) => m.Churches),
    canActivate: [authGuard, roleGuard('super_admin')],
  },

  {
    path: 'platform-admin/invitations',
    loadComponent: () =>
      import('./features/platform-admin/dashboard/invitation/invitation')
        .then((m) => m.Invitations),
    canActivate: [authGuard, roleGuard('super_admin')],
  },

  {
    path: 'platform-admin/churches/:churchId',
    loadComponent: () =>
      import('./features/platform-admin/dashboard/church_detail/ChurchDetail')
        .then((m) => m.ChurchDetails),
    canActivate: [authGuard, roleGuard('super_admin')],
  },

  // ---------------------------------------
  // CHURCH ADMIN
  // ---------------------------------------

  {
    path: 'church-admin',
    component: ChurchAdminLayout,
    canActivate: [authGuard, roleGuard('church_admin')],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/church-admin/dashboard/dashboard')
            .then((m) => m.Dashboard),
      },
      {
        path: 'members',
        loadComponent: () =>
          import('./features/church-admin/members/members')
            .then((m) => m.Members),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/church-admin/profile/profile')
            .then((m) => m.Profile),
      },
      {
        path: 'my-profile',
        loadComponent: () =>
          import('./features/shared/profile/role-profile')
            .then((m) => m.RoleProfile),
      },
      {
        path: 'finance',
        children: [
          {
            path: '',
            redirectTo: 'contributions',
            pathMatch: 'full',
          },
          {
            path: 'contributions',
            loadComponent: () =>
              import('./features/church-admin/finance/contributions/contributions')
                .then((m) => m.Contributions),
          },
          {
            path: 'categories',
            loadComponent: () =>
              import('./features/church-admin/finance/categories/categories')
                .then((m) => m.Categories),
          },
          {
            path: 'payment-methods',
            loadComponent: () =>
              import('./features/church-admin/finance/payment-methods/payment-methods')
                .then((m) => m.PaymentMethods),
          },
          {
            path: 'adjustments',
            loadComponent: () =>
              import('./features/church-admin/finance/adjustments/adjustments')
                .then((m) => m.Adjustments),
          },
          {
            path: 'reports',
            loadComponent: () =>
              import('./features/church-admin/finance/reports/reports')
                .then((m) => m.Reports),
          },
        ],
      },
      {
        path: 'content',
        loadComponent: () =>
          import('./features/church-admin/content/content')
            .then((m) => m.Content),
      },
      {
        path: 'staff',
        loadComponent: () =>
          import('./features/church-admin/staff/staff')
            .then((m) => m.Staff),
      },
      {
        path: 'events',
        loadComponent: () =>
          import('./features/church-admin/events/events')
            .then((m) => m.Events),
        data: {
          title: 'Church Events',
          description: 'Create and manage church events.',
        },
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/church-admin/notifications/notifications')
            .then((m) => m.Notifications),
        data: {
          title: 'Notifications',
          description: 'Create and manage church notifications.',
        },
      },
      {
        path: 'media',
        loadComponent: () =>
          import('./features/church-admin/media/media')
            .then((m) => m.Media),
        data: {
          title: 'Media Library',
          description: 'Manage images and videos uploaded by your church.',
        },
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/church-admin/reports/reports')
            .then((m) => m.Reports),
      },
    ],
  },

  // ---------------------------------------
  // MONEY COLLECTOR
  // ---------------------------------------

  {
    path: 'money-collector',
    loadComponent: () =>
      import('./features/shared/layouts/role-workspace-layout')
        .then((m) => m.RoleWorkspaceLayout),
    canActivate: [authGuard, roleGuard('money_collector')],
    data: { workspaceRole: 'money_collector' },
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/money-collector/dashboard/dashboard')
            .then((m) => m.MoneyCollectorDashboard),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/shared/profile/role-profile')
            .then((m) => m.RoleProfile),
      },
    ],
  },

  // ---------------------------------------
  // SECRETARY
  // ---------------------------------------

  {
    path: 'secretary',
    loadComponent: () =>
      import('./features/shared/layouts/role-workspace-layout')
        .then((m) => m.RoleWorkspaceLayout),
    canActivate: [authGuard, roleGuard('secretary')],
    data: { workspaceRole: 'secretary' },
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/secretary/dashboard/dashboard')
            .then((m) => m.SecretaryDashboard),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/shared/profile/role-profile')
            .then((m) => m.RoleProfile),
      },
    ],
  },

  // ---------------------------------------
  // CONTENT CREATOR
  // ---------------------------------------

  {
    path: 'content-creator',
    loadComponent: () =>
      import('./features/shared/layouts/role-workspace-layout')
        .then((m) => m.RoleWorkspaceLayout),
    canActivate: [authGuard, roleGuard('content_creator')],
    data: { workspaceRole: 'content_creator' },
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/content-creator/dashboard')
            .then((m) => m.ContentCreatorDashboard),
      },
      {
        path: 'posts',
        loadComponent: () =>
          import('./features/church-admin/content/content')
            .then((m) => m.Content),
      },
      {
        path: 'events',
        loadComponent: () =>
          import('./features/church-admin/events/events')
            .then((m) => m.Events),
      },
      {
        path: 'media',
        loadComponent: () =>
          import('./features/church-admin/media/media')
            .then((m) => m.Media),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/shared/profile/role-profile')
            .then((m) => m.RoleProfile),
      },
    ],
  },

  // ---------------------------------------
  // DEFAULT ROUTES
  // ---------------------------------------

  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },

  {
    path: '**',
    redirectTo: 'login',
  },
];
