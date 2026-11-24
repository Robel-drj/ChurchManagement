
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { AuthService } from '../../../core/service/auth.service';
import {
  MemberService,
  ChurchMember,
  MemberDetailsResponse,
  RegisterMemberRequest,
  UpdateMemberProfileRequest,
} from '../../../core/service/member.service';

@Component({
  selector: 'app-church-members',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './members.html',
  styleUrl: './members.scss',
})
export class Members implements OnInit {
    private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  churchId = '';

  members: ChurchMember[] = [];
  selectedMember: MemberDetailsResponse['data'] | null = null;

  loading = false;
  saving = false;
  detailsLoading = false;
  statusUpdatingMembershipId: string | null = null;

  errorMessage = '';
  successMessage = '';

  searchTerm = '';
  currentPage = 1;
  pageSize = 20;
  totalMembers = 0;
  totalPages = 0;

  showRegisterForm = false;
  showDetailsModal = false;
  showEditForm = false;

  registerData = {
    full_name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    gender: '',
    date_of_birth: '',
    address: '',
    emergency_contact: '',
  };

  editData = {
    gender: '',
    date_of_birth: '',
    address: '',
    emergency_contact: '',
  };

  constructor(
    private memberService: MemberService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const membership = this.authService.getActiveMembership();

    this.cdr.markForCheck();
    if (!membership?.churchId) {
      this.errorMessage = 'No active church membership was found.';
      return;
    }

    this.churchId = membership.churchId;
    this.loadMembers();

    if (this.route.snapshot.queryParamMap.get('action') === 'register') {
      this.openRegisterForm();
    }
  }

  loadMembers(): void {
    if (!this.churchId) return;

    this.cdr.markForCheck();
    this.loading = true;
    this.errorMessage = '';

    this.memberService
      .getMembers(
        this.churchId,
        this.currentPage,
        this.pageSize,
        this.searchTerm
      )
      .subscribe({
        next: (response) => {
          this.members = response.data.members;
          this.totalMembers = response.data.pagination.total;
          this.totalPages = response.data.pagination.totalPages;
          this.currentPage = response.data.pagination.page;
          this.loading = false;
          
    this.cdr.markForCheck();
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to load church members.'
          );
        },
      });
  }

  searchMembers(): void {
    this.currentPage = 1;
    this.loadMembers();
    
    this.cdr.markForCheck();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadMembers();
    
    this.cdr.markForCheck();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.currentPage = page;
    this.loadMembers();
    
    this.cdr.markForCheck();
  }

  openRegisterForm(): void {
    this.resetRegisterForm();
    this.errorMessage = '';
    this.successMessage = '';
    this.showRegisterForm = true;
    
    this.cdr.markForCheck();
  }

  closeRegisterForm(): void {
    this.showRegisterForm = false;
    this.resetRegisterForm();
    
    this.cdr.markForCheck();
  }

  resetRegisterForm(): void {
    this.registerData = {
      full_name: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
      gender: '',
      date_of_birth: '',
      address: '',
      emergency_contact: '',
      
    };
  }

  registerMember(): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.cdr.markForCheck();
    if (
      !this.registerData.full_name.trim() ||
      !this.registerData.phone.trim() ||
      !this.registerData.password
    ) {
      this.errorMessage = 'Full name, phone number, and password are required.';
      return;
    }

    if (this.registerData.password.length < 8) {
      this.errorMessage = 'Password must contain at least 8 characters.';
      return;
    }

    if (
      this.registerData.password !== this.registerData.confirmPassword
    ) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    const payload: RegisterMemberRequest = {
      full_name: this.registerData.full_name.trim(),
      phone: this.registerData.phone.trim(),
      password: this.registerData.password,
      ...(this.registerData.email.trim()
        ? { email: this.registerData.email.trim() }
        : {}),
      ...(this.registerData.gender
        ? { gender: this.registerData.gender }
        : {}),
      ...(this.registerData.date_of_birth
        ? { date_of_birth: this.registerData.date_of_birth }
        : {}),
      ...(this.registerData.address.trim()
        ? { address: this.registerData.address.trim() }
        : {}),
      ...(this.registerData.emergency_contact.trim()
        ? { emergency_contact: this.registerData.emergency_contact.trim() }
        : {}),
    };

    this.saving = true;

    this.memberService.registerMember(this.churchId, payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.showRegisterForm = false;
        this.resetRegisterForm();

        this.successMessage =
          response.message || 'Member registered successfully.';

        this.currentPage = 1;
        this.loadMembers();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = this.getErrorMessage(
          error,
          'Unable to register member.'
        );
      },
    });
  }

  openMemberDetails(member: ChurchMember): void {
    this.errorMessage = '';
    this.selectedMember = null;
    this.showDetailsModal = true;
    this.detailsLoading = true;

    this.cdr.markForCheck();
    this.memberService
      .getMemberDetails(this.churchId, member.membership_id)
      .subscribe({
        next: (response) => {
          this.selectedMember = response.data;
          this.detailsLoading = false;
        },
        error: (error) => {
          this.detailsLoading = false;
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to retrieve member details.'
          );
        },
      });
  }

  closeMemberDetails(): void {
    this.showDetailsModal = false;
    this.selectedMember = null;
    this.showEditForm = false;
    
    this.cdr.markForCheck();
  }

  openEditForm(): void {
    if (!this.selectedMember) return;

    this.editData = {
      gender: this.selectedMember.gender || '',
      date_of_birth: this.formatDateForInput(
        this.selectedMember.date_of_birth
      ),
      address: this.selectedMember.address || '',
      emergency_contact: this.selectedMember.emergency_contact || '',
    };

    this.showEditForm = true;
  }

  closeEditForm(): void {
    this.showEditForm = false;
  }

  updateMemberProfile(): void {
    if (!this.selectedMember) return;

    this.errorMessage = '';

    const payload: UpdateMemberProfileRequest = {
      gender: this.editData.gender.trim() || null,
      date_of_birth: this.editData.date_of_birth || null,
      address: this.editData.address.trim() || null,
      emergency_contact: this.editData.emergency_contact.trim() || null,
    };

    this.saving = true;

    this.memberService
      .updateMemberProfile(
        this.churchId,
        this.selectedMember.membership_id,
        
        payload
      )
      .subscribe({
        next: (response) => {
          this.saving = false;
          this.cdr.markForCheck();
          this.showEditForm = false;
          this.successMessage =
            response.message || 'Member profile updated successfully.';

          this.openMemberDetails({
            ...this.selectedMember!,
          } as ChurchMember);

          this.loadMembers();
        },
        error: (error) => {
          this.saving = false;
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to update member profile.'
          );
        },
      });
  }

  toggleMembershipStatus(member: ChurchMember): void {
    if (this.statusUpdatingMembershipId === member.membership_id) {
      return;
    }

    const nextStatus =
      member.membership_status === 'active' ? 'suspended' : 'active';

    const action =
      nextStatus === 'suspended' ? 'suspend' : 'activate';

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${member.full_name}'s membership?`
    );

    if (!confirmed) return;

    this.errorMessage = '';
    this.successMessage = '';
    this.statusUpdatingMembershipId = member.membership_id;

    this.cdr.markForCheck();
    this.memberService
      .updateMemberStatus(this.churchId, member.membership_id, {
        membership_status: nextStatus,
      })
      .subscribe({
        next: (response) => {
          this.statusUpdatingMembershipId = null;
          member.membership_status = nextStatus;
          this.successMessage =
            response.message || `Membership ${action}d successfully.`;

          if (
            this.selectedMember?.membership_id === member.membership_id
          ) {
            this.selectedMember.membership_status = nextStatus;
          }

          this.cdr.markForCheck();
          this.loadMembers();
        },
        error: (error) => {
          this.statusUpdatingMembershipId = null;
          this.errorMessage = this.getErrorMessage(
            error,
            `Unable to ${action} this membership.`
          );
          this.cdr.markForCheck();
        },
      });
  }

  isMembershipStatusUpdating(member: ChurchMember): boolean {
    return this.statusUpdatingMembershipId === member.membership_id;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'pending':
        return 'status-pending';
      case 'suspended':
        return 'status-suspended';
      default:
        return '';
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];

    for (let page = 1; page <= this.totalPages; page++) {
      pages.push(page);
    }

    return pages;
  }

  private formatDateForInput(value: string | null): string {
    if (!value) return '';

    return value.substring(0, 10);
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
