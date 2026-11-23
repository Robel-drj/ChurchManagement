import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../../../core/service/auth.service';
import { FinanceService } from '../../../../core/service/finance.service';

import {
  Contribution,
  ContributionAdjustment,
  AdjustmentType,
  CreateAdjustmentRequest,
} from '../../../../core/service/finance.service';

@Component({
  selector: 'app-finance-adjustments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './adjustments.html',
  styleUrl: './adjustments.scss',
})
export class Adjustments implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);

  churchId = '';

  adjustments: ContributionAdjustment[] = [];
  contributions: Contribution[] = [];

  loading = false;
  loadingContributions = false;
  saving = false;

  errorMessage = '';
  successMessage = '';

  statusFilter = '';
  typeFilter = '';

  currentPage = 1;
  pageSize = 20;
  total = 0;
  totalPages = 0;

  showCreateForm = false;

  createData = {
    contribution_id: '',
    adjustment_type: 'refund' as AdjustmentType,
    amount: 0,
    reason: '',
  };

  constructor(
    private authService: AuthService,
    private financeService: FinanceService
  ) {}

  ngOnInit(): void {
    const membership = this.authService.getActiveMembership();

    if (!membership?.churchId) {
      this.errorMessage = 'No active church membership was found.';
      return;
    }

    this.churchId = membership.churchId;

    this.loadAdjustments();
    this.loadContributions();
  }

  loadAdjustments(): void {
    this.loading = true;
    this.errorMessage = '';

    this.financeService
      .getAdjustments(
        this.churchId,
        this.currentPage,
        this.pageSize,
        this.statusFilter,
        this.typeFilter
      )
      .subscribe({
        next: (response) => {
          this.adjustments = response.data.adjustments || [];
          this.total = response.data.pagination.total;
          this.totalPages = response.data.pagination.total_pages;
          this.currentPage = response.data.pagination.page;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to load contribution adjustments.'
          );
          this.cdr.markForCheck();
        },
      });
  }

  loadContributions(): void {
    this.loadingContributions = true;

    this.financeService
      .getContributions(this.churchId, {
        page: 1,
        limit: 100,
      })
      .subscribe({
        next: (response) => {
          this.contributions = response.data || [];
          this.loadingContributions = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.loadingContributions = false;
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to load contributions for adjustment requests.'
          );
          this.cdr.markForCheck();
        },
      });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadAdjustments();
  }

  clearFilters(): void {
    this.statusFilter = '';
    this.typeFilter = '';
    this.currentPage = 1;
    this.loadAdjustments();
  }

  getPageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.currentPage = page;
    this.loadAdjustments();
  }

  openCreateForm(): void {
    this.createData = {
      contribution_id: '',
      adjustment_type: 'refund',
      amount: 0,
      reason: '',
    };

    this.errorMessage = '';
    this.showCreateForm = true;
  }

  closeCreateForm(): void {
    this.showCreateForm = false;
  }

  get selectedContribution(): Contribution | undefined {
    return this.contributions.find(
      (item) => item.id === this.createData.contribution_id
    );
  }

  createAdjustment(): void {
    if (!this.createData.contribution_id) {
      this.errorMessage = 'Select a contribution.';
      return;
    }

    if (
      !Number.isFinite(Number(this.createData.amount)) ||
      Number(this.createData.amount) <= 0
    ) {
      this.errorMessage = 'Enter an amount greater than zero.';
      return;
    }

    if (this.createData.reason.trim().length < 5) {
      this.errorMessage = 'Reason must contain at least 5 characters.';
      return;
    }

    if (this.createData.reason.trim().length > 2000) {
      this.errorMessage = 'Reason cannot exceed 2000 characters.';
      return;
    }

    const payload: CreateAdjustmentRequest = {
      contribution_id: this.createData.contribution_id,
      adjustment_type: this.createData.adjustment_type,
      amount: Number(this.createData.amount),
      reason: this.createData.reason.trim(),
    };

    this.saving = true;
    this.errorMessage = '';

    this.financeService
      .createAdjustment(this.churchId, payload)
      .subscribe({
        next: (response) => {
          this.saving = false;
          this.showCreateForm = false;
          this.successMessage =
            response.message || 'Adjustment request submitted successfully.';

          this.currentPage = 1;
          this.cdr.markForCheck();
          this.loadAdjustments();
        },
        error: (error) => {
          this.saving = false;
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to submit adjustment request.'
          );
          this.cdr.markForCheck();
        },
      });
  }

  decideAdjustment(
    adjustment: ContributionAdjustment,
    decision: 'approved' | 'rejected'
  ): void {
    if (adjustment.status !== 'pending') return;

    const confirmed = window.confirm(
      `Are you sure you want to ${decision} this ${adjustment.adjustment_type} request?`
    );

    if (!confirmed) return;

    this.errorMessage = '';
    this.successMessage = '';

    this.financeService
      .decideAdjustment(this.churchId, adjustment.id, { decision })
      .subscribe({
        next: (response) => {
          this.successMessage =
            response.message ||
            `Adjustment request ${decision} successfully.`;

          this.cdr.markForCheck();
          this.loadAdjustments();
        },
        error: (error) => {
          this.errorMessage = this.getErrorMessage(
            error,
            `Unable to ${decision} adjustment request.`
          );
          this.cdr.markForCheck();
        },
      });
  }

  formatType(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  formatStatus(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  formatAmount(amount: number | null): string {
    if (amount === null || amount === undefined) return '—';

    return Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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
