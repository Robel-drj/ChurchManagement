import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MemberService } from '../../../core/service/member.service';
import { AuthService } from '../../../core/service/auth.service';

interface SecretaryMember {
  membership_id: string;
  member_number: string | null;
  membership_status: string;
  joined_at: string;
  full_name: string;
  phone: string;
  email: string | null;
}

@Component({
  selector: 'app-secretary-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class SecretaryDashboard implements OnInit {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  churchId = '';
  churchName = '';

  loading = false;
  errorMessage = '';

  members: SecretaryMember[] = [];
  search = '';

  totalMembers = 0;
  activeMembers = 0;
  suspendedMembers = 0;
  pendingMembers = 0;

  constructor(
    private memberService: MemberService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const membership = this.authService.getActiveMembership();

    if (!membership?.churchId) {
      this.errorMessage = 'Please select a church first.';
      return;
    }

    this.churchId = membership.churchId;
    this.churchName = membership.church?.name ?? '';

    this.loadMembers();
  }

  loadMembers(): void {
    this.loading = true;
    this.errorMessage = '';

    this.memberService.getMembers(
      this.churchId,
      1,
      100,
      this.search
    ).subscribe({
      next: (response) => {
        const members = response.data?.members ?? [];

        this.members = members.map((member: any) => ({
          membership_id: member.membership_id,
          member_number: member.member_number,
          membership_status: member.membership_status,
          joined_at: member.joined_at,
          full_name: member.full_name,
          phone: member.phone,
          email: member.email,
        }));

        this.totalMembers = response.data?.pagination?.total ?? members.length;

        this.activeMembers = members.filter(
          (member: any) => member.membership_status === 'active'
        ).length;

        this.suspendedMembers = members.filter(
          (member: any) => member.membership_status === 'suspended'
        ).length;

        this.pendingMembers = members.filter(
          (member: any) => member.membership_status === 'pending'
        ).length;

        this.loading = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error?.error?.message ?? 'Failed to load members.';
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  searchMembers(): void {
    this.loadMembers();
  }

  clearSearch(): void {
    this.search = '';
    this.loadMembers();
  }

  get recentMembers(): SecretaryMember[] {
    return [...this.members]
      .sort((a, b) =>
        new Date(b.joined_at).getTime() -
        new Date(a.joined_at).getTime()
      )
      .slice(0, 8);
  }

  trackByMember(index: number, member: SecretaryMember): string {
    return member.membership_id;
  }
}
