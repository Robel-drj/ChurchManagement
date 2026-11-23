import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../../core/service/auth.service';
import {
  FinanceReportData,
  FinanceService,
} from '../../../core/service/finance.service';
import {
  ChurchMember,
  MemberService,
} from '../../../core/service/member.service';

type ReportMember = Pick<
  ChurchMember,
  | 'membership_id'
  | 'member_number'
  | 'membership_status'
  | 'joined_at'
  | 'full_name'
  | 'phone'
  | 'email'
>;

type ReportTab = 'membership' | 'financial';

@Component({
  selector: 'app-church-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);

  churchId = '';
  churchName = '';

  activeTab: ReportTab = 'membership';

  loadingMembers = false;
  loadingFinance = false;

  errorMessage = '';
  financeErrorMessage = '';

  members: ReportMember[] = [];
  search = '';

  totalMembers = 0;
  activeMembers = 0;
  pendingMembers = 0;
  suspendedMembers = 0;

  financialReport: FinanceReportData | null = null;

  dateFrom = '';
  dateTo = '';

  constructor(
    private memberService: MemberService,
    private financeService: FinanceService,
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

    this.setDefaultDates();
    this.loadMembershipReport();
  }

  setTab(tab: ReportTab): void {
    this.activeTab = tab;

    if (
      tab === 'membership' &&
      this.members.length === 0 &&
      !this.loadingMembers
    ) {
      this.loadMembershipReport();
    }

    if (
      tab === 'financial' &&
      !this.financialReport &&
      !this.loadingFinance
    ) {
      this.loadFinancialReport();
    }
  }

  loadMembershipReport(): void {
    this.loadingMembers = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.memberService
      .getMembers(this.churchId, 1, 100, this.search)
      .subscribe({
        next: (firstResponse) => {
          const firstPageMembers = firstResponse.data.members ?? [];
          const pagination = firstResponse.data.pagination;
          const totalPages = pagination.totalPages ?? 1;

          if (totalPages <= 1) {
            this.processMembers(firstPageMembers, pagination.total);
            return;
          }

          const remainingPageRequests = Array.from(
            { length: totalPages - 1 },
            (_, index) =>
              this.memberService.getMembers(
                this.churchId,
                index + 2,
                100,
                this.search
              )
          );

          forkJoin(remainingPageRequests).subscribe({
            next: (responses) => {
              const allMembers = [
                ...firstPageMembers,
                ...responses.flatMap((response) => response.data.members ?? []),
              ];

              this.processMembers(allMembers, pagination.total);
            },
            error: (error) => this.handleMembershipError(error),
          });
        },
        error: (error) => this.handleMembershipError(error),
      });
  }

  resetMemberSearch(): void {
    this.search = '';
    this.loadMembershipReport();
  }

  setDefaultDates(): void {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    this.dateFrom = this.formatDate(firstDay);
    this.dateTo = this.formatDate(now);
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  loadFinancialReport(): void {
    if (this.dateFrom && this.dateTo && this.dateFrom > this.dateTo) {
      this.financeErrorMessage = 'Start date cannot be after end date.';
      return;
    }

    this.loadingFinance = true;
    this.financeErrorMessage = '';
    this.cdr.markForCheck();

    this.financeService
      .getFinanceReport(this.churchId, this.dateFrom, this.dateTo)
      .subscribe({
        next: (response) => {
          this.financialReport = response.data;
          this.loadingFinance = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.loadingFinance = false;
          this.financeErrorMessage = this.getErrorMessage(
            error,
            'Failed to load financial report.'
          );
          this.cdr.markForCheck();
        },
      });
  }

  resetFinanceDates(): void {
    this.setDefaultDates();
    this.loadFinancialReport();
  }

  formatAmount(amount: number | string | null | undefined): string {
    const value = Number(amount ?? 0);

    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);
  }

  exportCsv(): void {
    const headers = [
      'Member Number',
      'Full Name',
      'Phone',
      'Email',
      'Membership Status',
      'Joined Date',
    ];

    const rows = this.members.map((member) => [
      member.member_number ?? '',
      member.full_name,
      member.phone,
      member.email ?? '',
      member.membership_status,
      member.joined_at,
    ]);

    const escapeCsv = (value: unknown): string =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;

    const csv = [
      headers.map(escapeCsv).join(','),
      ...rows.map((row) => row.map(escapeCsv).join(',')),
    ].join('\r\n');

    const blob = new Blob(['\ufeff', csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'church-members-report.csv';
    link.click();

    URL.revokeObjectURL(url);
  }

  trackByMember(_index: number, member: ReportMember): string {
    return member.membership_id;
  }

  private processMembers(members: ChurchMember[], total: number): void {
    this.members = members.map((member) => ({
      membership_id: member.membership_id,
      member_number: member.member_number,
      membership_status: member.membership_status,
      joined_at: member.joined_at,
      full_name: member.full_name,
      phone: member.phone,
      email: member.email,
    }));

    this.totalMembers = total;
    this.activeMembers = members.filter(
      (member) => member.membership_status === 'active'
    ).length;
    this.pendingMembers = members.filter(
      (member) => member.membership_status === 'pending'
    ).length;
    this.suspendedMembers = members.filter(
      (member) => member.membership_status === 'suspended'
    ).length;

    this.loadingMembers = false;
    this.cdr.markForCheck();
  }

  private handleMembershipError(error: any): void {
    this.loadingMembers = false;
    this.errorMessage = this.getErrorMessage(
      error,
      'Failed to load members.'
    );
    this.cdr.markForCheck();
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
