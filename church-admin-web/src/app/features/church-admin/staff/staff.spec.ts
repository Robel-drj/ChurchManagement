import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthService } from '../../../core/service/auth.service';
import {
  ChurchMember,
  MemberService,
} from '../../../core/service/member.service';
import {
  ChurchStaff,
  StaffService,
} from '../../../core/service/staff.service';
import { Staff } from './staff';

describe('Staff role assignment', () => {
  let component: Staff;
  let fixture: ComponentFixture<Staff>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Staff],
      providers: [
        {
          provide: AuthService,
          useValue: { getActiveMembership: () => null },
        },
        { provide: StaffService, useValue: {} },
        { provide: MemberService, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Staff);
    component = fixture.componentInstance;

    component.members = ['member-1', 'member-2', 'member-3'].map(
      (membershipId) => ({
        membership_id: membershipId,
        membership_status: 'active',
      } as ChurchMember)
    );
    component.staff = [
      {
        membership_id: 'member-1',
        staff_roles: ['content_creator'],
      } as ChurchStaff,
      {
        membership_id: 'member-2',
        staff_roles: ['money_collector'],
      } as ChurchStaff,
    ];
  });

  it('allows existing staff to receive a different role', () => {
    component.selectedRole = 'secretary';

    expect(component.availableMembers.map((member) => member.membership_id))
      .toEqual(['member-1', 'member-2', 'member-3']);
  });

  it('excludes only members who already have the selected role', () => {
    component.selectedRole = 'content_creator';

    expect(component.availableMembers.map((member) => member.membership_id))
      .toEqual(['member-2', 'member-3']);
  });
});
