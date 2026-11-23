import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { AuthService, AuthUser } from './auth.service';

describe('AuthService workspace routing', () => {
  let service: AuthService;

  const churchAdminMembership = {
    membershipId: 'membership-1',
    churchId: 'church-1',
    memberNumber: 'MEM-001',
    membershipStatus: 'active',
    church: {
      id: 'church-1',
      name: 'Test Church',
      code: 'TEST-001',
      logoUrl: null,
      status: 'active',
    },
    roles: ['church_admin'],
  };

  const createUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
    id: 'user-1',
    fullName: 'Test User',
    phone: '0912345678',
    email: 'test@example.com',
    accountStatus: 'active',
    createdAt: new Date(0).toISOString(),
    platformRoles: [],
    memberships: [],
    ...overrides,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(AuthService);
    sessionStorage.clear();
  });

  afterEach(() => sessionStorage.clear());

  function storeUser(user: AuthUser): void {
    sessionStorage.setItem('accessToken', 'test-token');
    sessionStorage.setItem('currentUser', JSON.stringify(user));
  }

  it('keeps legacy mixed-role accounts in the platform workspace only', () => {
    storeUser(createUser({
      platformRoles: ['super_admin'],
      memberships: [churchAdminMembership],
    }));
    sessionStorage.setItem('activeMembershipId', 'membership-1');
    sessionStorage.setItem('activeChurchRole', 'church_admin');

    expect(service.getCurrentUser()?.memberships).toEqual([]);
    expect(service.getInitialRoute()).toBe('/platform-admin/dashboard');
    expect(service.hasMultipleWorkspaces()).toBe(false);
    expect(service.getActiveMembershipId()).toBeNull();
    expect(service.getActiveChurchRole()).toBeNull();
  });

  it('opens the platform dashboard directly for platform-only admins', () => {
    storeUser(createUser({ platformRoles: ['super_admin'] }));

    expect(service.getInitialRoute()).toBe('/platform-admin/dashboard');
  });

  it('selects the only church workspace automatically', () => {
    storeUser(createUser({ memberships: [churchAdminMembership] }));

    expect(service.getInitialRoute()).toBe('/church-admin/dashboard');
    expect(service.getActiveMembershipId()).toBe('membership-1');
    expect(service.getActiveChurchRole()).toBe('church_admin');
  });
});
