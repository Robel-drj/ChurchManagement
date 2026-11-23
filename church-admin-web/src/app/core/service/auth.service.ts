
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export const PLATFORM_ADMIN_ROLE = 'super_admin';

const CHURCH_DASHBOARD_ROLES = [
  'church_admin',
  'money_collector',
  'secretary',
  'content_creator',
] as const;

export type ChurchDashboardRole = (typeof CHURCH_DASHBOARD_ROLES)[number];

export interface ChurchInfo {
  id: string;
  name: string;
  code: string;
  logoUrl: string | null;
  status: string;
}

export interface ChurchMembership {
  membershipId: string;
  churchId: string;
  memberNumber: string | null;
  membershipStatus: string;
  church: ChurchInfo;
  roles: string[];
}

export interface AuthUser {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  accountStatus: string;
  createdAt: string;
  platformRoles: string[];
  memberships: ChurchMembership[];
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/auth';

  login(credentials: {
    identifier: string;
    password: string;
  }): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap((response) => {
          sessionStorage.setItem(
            'accessToken',
            response.data.accessToken
          );

          sessionStorage.setItem(
            'refreshToken',
            response.data.refreshToken
          );

          sessionStorage.setItem(
            'currentUser',
            JSON.stringify(this.normalizeUserAccess(response.data.user))
          );

          sessionStorage.removeItem('activeMembershipId');
          sessionStorage.removeItem('activeChurchRole');
        })
      );
  }

  getAccessToken(): string | null {
    return sessionStorage.getItem('accessToken');
  }

  getCurrentUser(): AuthUser | null {
    const storedUser = sessionStorage.getItem('currentUser');

    if (!storedUser) {
      return null;
    }

    try {
      return this.normalizeUserAccess(
        JSON.parse(storedUser) as AuthUser
      );
    } catch {
      this.clearSession();
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken() && !!this.getCurrentUser();
  }

  setActiveContext(membershipId: string, role: string): void {
    if (this.isPlatformAdmin()) {
      this.clearActiveContext();
      return;
    }

    sessionStorage.setItem('activeMembershipId', membershipId);
    sessionStorage.setItem('activeChurchRole', role);
  }

  clearActiveContext(): void {
    sessionStorage.removeItem('activeMembershipId');
    sessionStorage.removeItem('activeChurchRole');
  }

  getActiveMembershipId(): string | null {
    return sessionStorage.getItem('activeMembershipId');
  }

  getActiveChurchRole(): string | null {
    return sessionStorage.getItem('activeChurchRole');
  }

  getActiveMembership(): ChurchMembership | null {
    const user = this.getCurrentUser();
    const membershipId = this.getActiveMembershipId();

    if (!user || this.isPlatformAdmin(user) || !membershipId) {
      return null;
    }

    return (user.memberships ?? []).find(
      (membership) => membership.membershipId === membershipId
    ) ?? null;
  }

  isPlatformAdmin(
    user: AuthUser | null = this.getCurrentUser()
  ): boolean {
    return user?.platformRoles?.includes(PLATFORM_ADMIN_ROLE) ?? false;
  }

  isChurchDashboardRole(role: string): role is ChurchDashboardRole {
    return (CHURCH_DASHBOARD_ROLES as readonly string[]).includes(role);
  }

  getChurchWorkspaceCount(user = this.getCurrentUser()): number {
    if (!user) {
      return 0;
    }

    if (this.isPlatformAdmin(user)) {
      return 0;
    }

    return (user.memberships ?? []).reduce(
      (total, membership) =>
        total + membership.roles.filter((role) =>
          this.isChurchDashboardRole(role)
        ).length,
      0
    );
  }

  hasMultipleWorkspaces(user = this.getCurrentUser()): boolean {
    if (!user) {
      return false;
    }

    if (this.isPlatformAdmin(user)) {
      return false;
    }

    return this.getChurchWorkspaceCount(user) > 1;
  }

  getInitialRoute(): string {
    const user = this.getCurrentUser();

    if (!user) {
      return '/login';
    }

    if (this.isPlatformAdmin(user)) {
      this.clearActiveContext();
      return '/platform-admin/dashboard';
    }

    const churchWorkspaces = (user.memberships ?? []).flatMap(
      (membership) =>
        membership.roles
          .filter((role) => this.isChurchDashboardRole(role))
          .map((role) => ({ membership, role }))
    );

    if (churchWorkspaces.length === 0) {
      return '/no-access';
    }

    if (churchWorkspaces.length > 1) {
      return '/select-context';
    }

    const { membership, role } = churchWorkspaces[0];
    this.setActiveContext(membership.membershipId, role);

    return this.getRouteForChurchRole(role);
  }

  getRouteForChurchRole(role: string): string {
    switch (role) {
      case 'church_admin':
        return '/church-admin/dashboard';

      case 'money_collector':
        return '/money-collector/dashboard';

      case 'secretary':
        return '/secretary/dashboard';

      case 'content_creator':
        return '/content-creator/dashboard';

      default:
        return '/no-access';
    }
  }

  clearSession(): void {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('activeMembershipId');
    sessionStorage.removeItem('activeChurchRole');
  }

  logout(): void {
    const refreshToken = sessionStorage.getItem('refreshToken');

    if (refreshToken) {
      this.http.post(`${this.apiUrl}/logout`, { refreshToken }).subscribe({
        error: () => {
          // The local session is still cleared if the API request fails.
        },
      });
    }

    this.clearSession();
  }

  private normalizeUserAccess(user: AuthUser): AuthUser {
    if (!this.isPlatformAdmin(user)) {
      return user;
    }

    return {
      ...user,
      memberships: [],
    };
  }
}
