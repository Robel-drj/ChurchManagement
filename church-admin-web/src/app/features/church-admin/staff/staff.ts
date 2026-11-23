
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../../core/service/auth.service';
import {
  MemberService,
  ChurchMember,
} from '../../../core/service/member.service';

import {
  StaffService,
  ChurchStaff,
  AssignableStaffRole,
} from '../../../core/service/staff.service';

@Component({
  selector: 'app-church-staff',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff.html',
  styleUrl: './staff.scss',
})
export class Staff implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  churchId = '';

  staff: ChurchStaff[] = [];
  members: ChurchMember[] = [];

  loading = false;
  loadingMembers = false;
  saving = false;

  errorMessage = '';
  successMessage = '';

  searchTerm = '';

  showAssignForm = false;
  selectedMembershipId = '';
  selectedRole: AssignableStaffRole = 'secretary';

  readonly assignableRoles: {
    value: AssignableStaffRole;
    label: string;
    description: string;
  }[] = [
    {
      value: 'secretary',
      label: 'Secretary',
      description: 'Manages church records and administrative activities.',
    },
    {
      value: 'money_collector',
      label: 'Money Collector',
      description: 'Records and manages permitted church financial activities.',
    },
    {
      value: 'content_creator',
      label: 'Content Creator',
      description: 'Creates and manages permitted church content.',
    },
  ];

  constructor(
    private authService: AuthService,
    private staffService: StaffService,
    private memberService: MemberService
  ) {}

  ngOnInit(): void {
    const membership = this.authService.getActiveMembership();

    if (!membership?.churchId) {
      this.errorMessage = 'No active church membership was found.';
      return;
    }

    this.churchId = membership.churchId;

    this.loadStaff();
    this.loadMembers();
    this.cdr.markForCheck();
  }

  loadStaff(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.staffService.getStaff(this.churchId).subscribe({
      next: (response) => {
        this.staff = response.data || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = this.getErrorMessage(
          error,
          'Unable to load church staff.'
        );
        this.cdr.markForCheck();
      },
    });
  }

  loadMembers(): void {
    this.loadingMembers = true;
    this.cdr.markForCheck();
    this.memberService
      .getMembers(this.churchId, 1, 100, '')
      .subscribe({
        next: (response) => {
          this.members = response.data.members.filter(
            (member) => member.membership_status === 'active'
          );
          this.loadingMembers = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.loadingMembers = false;
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to load church members for role assignment.'
          );
          this.cdr.markForCheck();
        },
      });
  }

  countRole(roleName: string): number {
    return this.staff.filter((person) =>
      person.staff_roles.includes(roleName)
    ).length;
  }

  get selectedRoleLabel(): string {
    return this.assignableRoles.find(
      (role) => role.value === this.selectedRole
    )?.label || '';
  }

  get selectedRoleDescription(): string {
    return this.assignableRoles.find(
      (role) => role.value === this.selectedRole
    )?.description || '';
  }

  get filteredStaff(): ChurchStaff[] {
    const search = this.searchTerm.trim().toLowerCase();

    if (!search) return this.staff;

    return this.staff.filter((person) =>
      [
        person.full_name,
        person.phone,
        person.email || '',
        person.member_number || '',
        ...person.staff_roles,
      ]
        .join(' ')
        .toLowerCase()
        .includes(search)
    );
  }
  get availableMembers(): ChurchMember[] {
    return this.members.filter((member) => {
      const existingStaff = this.staff.find(
        (person) => person.membership_id === member.membership_id
      );

      return (
        !existingStaff ||
        !existingStaff.staff_roles.includes(this.selectedRole)
      );
    });
  }

  openAssignForm(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.selectedMembershipId = '';
    this.selectedRole = 'secretary';
    this.showAssignForm = true;
    this.cdr.markForCheck();
  }

  closeAssignForm(): void {
    this.showAssignForm = false;
    this.selectedMembershipId = '';
    this.cdr.markForCheck();
  }

  assignRole(): void {
    if (!this.selectedMembershipId) {
      this.errorMessage = 'Please select a church member.';
      return;
    }

    if (!this.selectedRole) {
      this.errorMessage = 'Please select a staff role.';
      return;
    }

    const member = this.members.find(
      (item) => item.membership_id === this.selectedMembershipId
    );

    const existingStaff = this.staff.find(
      (item) => item.membership_id === this.selectedMembershipId
    );

    if (existingStaff?.staff_roles.includes(this.selectedRole)) {
      this.errorMessage = 'This member already has that role.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.saving = true;
    this.cdr.markForCheck();
    this.staffService
      .assignRole(
        this.churchId,
        this.selectedMembershipId,
        this.selectedRole
      )
      .subscribe({
        next: (response) => {
          this.saving = false;
          this.showAssignForm = false;

          this.successMessage =
            response.message ||
            `${member?.full_name || 'Member'} was assigned the ${this.selectedRole} role.`;

          this.loadStaff();
        },
        error: (error) => {
          this.saving = false;
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to assign this staff role.'
          );
          this.cdr.markForCheck();
        },
      });
  }

  removeRole(person: ChurchStaff, role: string): void {
    if (!this.isAssignableRole(role)) {
      return;
    }

    const confirmed = window.confirm(
      `Remove the ${this.formatRole(role)} role from ${person.full_name}?`
    );

    if (!confirmed) return;

    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    this.staffService
      .removeRole(
        this.churchId,
        person.membership_id,
        role
      )
      .subscribe({
        next: (response) => {
          this.successMessage =
            response.message ||
            `${this.formatRole(role)} role removed successfully.`;

          this.loadStaff();
        },
        error: (error) => {
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to remove this staff role.'
          );
          this.cdr.markForCheck();
        },
      });
  }

  isAssignableRole(role: string): role is AssignableStaffRole {
    return (
      role === 'secretary' ||
      role === 'money_collector' ||
      role === 'content_creator'
    );
  }

  formatRole(role: string): string {
    return role
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  getRoleClass(role: string): string {
    switch (role) {
      case 'church_admin':
        return 'role-admin';
      case 'secretary':
        return 'role-secretary';
      case 'money_collector':
        return 'role-finance';
      case 'content_creator':
        return 'role-content';
      default:
        return 'role-default';
    }
  }

  trackByMembership(
    index: number,
    person: ChurchStaff
  ): string {
    return person.membership_id;
  }

  private getErrorMessage(error: any, fallback: string): string {
    return (
      error?.error?.message ||
      error?.error?.error?.message ||
      error?.message ||
      fallback
    );
  }
}
