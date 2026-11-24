import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';

import { AuthService } from '../../../core/service/auth.service';
import { ChurchMember, MemberService } from '../../../core/service/member.service';
import { Members } from './members';

describe('Members membership status', () => {
  const memberService = {
    getMembers: vi.fn(() => NEVER),
    updateMemberStatus: vi.fn(),
  };

  let component: Members;

  beforeEach(async () => {
    memberService.getMembers.mockClear();
    memberService.updateMemberStatus.mockReset();
    memberService.updateMemberStatus.mockReturnValue(NEVER);

    await TestBed.configureTestingModule({
      imports: [Members],
      providers: [
        {
          provide: AuthService,
          useValue: { getActiveMembership: () => null },
        },
        { provide: MemberService, useValue: memberService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    }).compileComponents();

    component = TestBed.createComponent(Members).componentInstance;
    component.churchId = 'church-1';
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requests active status for a suspended member', () => {
    const member = suspendedMember();

    component.toggleMembershipStatus(member);

    expect(memberService.updateMemberStatus).toHaveBeenCalledWith('church-1', 'membership-1', {
      membership_status: 'active',
    });
    expect(component.statusUpdatingMembershipId).toBe('membership-1');
  });

  it('updates the member and clears progress after activation succeeds', () => {
    const member = suspendedMember();
    memberService.updateMemberStatus.mockReturnValue(
      of({ message: 'Membership status updated successfully.' }),
    );

    component.toggleMembershipStatus(member);

    expect(member.membership_status).toBe('active');
    expect(component.statusUpdatingMembershipId).toBeNull();
    expect(component.successMessage).toBe('Membership status updated successfully.');
  });

  it('shows the API error and clears progress when activation fails', () => {
    const member = suspendedMember();
    memberService.updateMemberStatus.mockReturnValue(
      throwError(() => ({ error: { message: 'Activation was rejected.' } })),
    );

    component.toggleMembershipStatus(member);

    expect(member.membership_status).toBe('suspended');
    expect(component.statusUpdatingMembershipId).toBeNull();
    expect(component.errorMessage).toBe('Activation was rejected.');
  });
});

function suspendedMember(): ChurchMember {
  return {
    membership_id: 'membership-1',
    member_number: 'MEM-001',
    membership_status: 'suspended',
    joined_at: '2026-11-01T00:00:00.000Z',
    user_id: 'user-1',
    full_name: 'Test Member',
    phone: '+1 555 0100',
    email: 'member@example.com',
    gender: null,
    date_of_birth: null,
    address: null,
    emergency_contact: null,
    profile_image: null,
    roles: ['member'],
  };
}
