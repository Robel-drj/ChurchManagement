import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { AuthService } from '../../../../core/service/auth.service';

import {
  FinanceService,
  ContributionMemberOption,
  Contribution,
  ContributionDetails,
  FinanceCategory,
  FinancePaymentMethod,
  ContributionStatus,
  CreateContributionRequest,
  UpdateContributionRequest,
} from '../../../../core/service/finance.service';

@Component({
  selector: 'app-contributions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contributions.html',
  styleUrl: './contributions.scss',
})
export class Contributions implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);

  churchId = '';

  contributions: Contribution[] = [];
  members: ContributionMemberOption[] = [];
  categories: FinanceCategory[] = [];
  paymentMethods: FinancePaymentMethod[] = [];

  selectedContribution: ContributionDetails | null = null;

  loading = false;
  loadingOptions = false;
  detailsLoading = false;
  saving = false;

  errorMessage = '';
  successMessage = '';

  searchTerm = '';
  statusFilter = '';
  categoryFilter = '';
  paymentMethodFilter = '';
  dateFrom = '';
  dateTo = '';

  currentPage = 1;
  pageSize = 20;
  total = 0;
  totalPages = 0;

  showCreateForm = false;
  showDetailsModal = false;
  showEditForm = false;

  createData = {
    membership_id: '',
    category_id: '',
    payment_method_id: '',
    amount: 0,
    payment_status: 'confirmed' as 'pending' | 'confirmed',
    transaction_reference: '',
    contribution_date: '',
    notes: '',
  };

  editData = {
    payment_status: '' as '' | 'confirmed' | 'rejected',
    transaction_reference: '',
    notes: '',
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

    this.loadOptions();
    this.loadContributions();

    if (this.route.snapshot.queryParamMap.get('action') === 'record') {
      this.openCreateForm();
    }
  }

  loadOptions(): void {
    this.loadingOptions = true;

    let completed = 0;

    const finish = (): void => {
      completed++;

      if (completed === 3) {
        this.loadingOptions = false;
      }

      this.cdr.markForCheck();
    };

    this.financeService.getContributionMembers(this.churchId).subscribe({
      next: (response) => {
        this.members = response.data;
        finish();
      },
      error: (error) => {
        this.errorMessage = this.getErrorMessage(
          error,
          'Unable to load members.'
        );
        finish();
      },
    });

    this.financeService.getCategories(this.churchId).subscribe({
      next: (response) => {
        this.categories = response.data.filter((item) => item.is_active);
        finish();
      },
      error: (error) => {
        this.errorMessage = this.getErrorMessage(
          error,
          'Unable to load contribution categories.'
        );
        finish();
      },
    });

    this.financeService.getPaymentMethods(this.churchId).subscribe({
      next: (response) => {
        this.paymentMethods = response.data.filter((item) => item.is_active);
        finish();
      },
      error: (error) => {
        this.errorMessage = this.getErrorMessage(
          error,
          'Unable to load payment methods.'
        );
        finish();
      },
    });
  }

  loadContributions(): void {
    this.loading = true;
    this.errorMessage = '';

    this.financeService
      .getContributions(this.churchId, {
        page: this.currentPage,
        limit: this.pageSize,
        search: this.searchTerm.trim(),
        payment_status: this.statusFilter,
        category_id: this.categoryFilter,
        payment_method_id: this.paymentMethodFilter,
        date_from: this.dateFrom,
        date_to: this.dateTo,
      })
      .subscribe({
        next: (response) => {
          this.contributions = response.data || [];
          this.total = response.pagination.total;
          this.totalPages = response.pagination.total_pages;
          this.currentPage = response.pagination.page;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to load contributions.'
          );
          this.cdr.markForCheck();
        },
      });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadContributions();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.categoryFilter = '';
    this.paymentMethodFilter = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.currentPage = 1;
    this.loadContributions();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.currentPage = page;
    this.loadContributions();
  }

  getPageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  openCreateForm(): void {
    this.resetCreateForm();
    this.errorMessage = '';
    this.successMessage = '';
    this.showCreateForm = true;
  }

  closeCreateForm(): void {
    this.showCreateForm = false;
    this.resetCreateForm();
  }

  resetCreateForm(): void {
    this.createData = {
      membership_id: '',
      category_id: '',
      payment_method_id: '',
      amount: 0,
      payment_status: 'confirmed',
      transaction_reference: '',
      contribution_date: '',
      notes: '',
    };
  }

  createContribution(): void {
    if (
      !this.createData.membership_id ||
      !this.createData.category_id ||
      !this.createData.payment_method_id
    ) {
      this.errorMessage =
        'Select a member, contribution category, and payment method.';
      return;
    }

    if (
      !Number.isFinite(Number(this.createData.amount)) ||
      Number(this.createData.amount) <= 0
    ) {
      this.errorMessage = 'Enter a valid contribution amount greater than zero.';
      return;
    }

    const payload: CreateContributionRequest = {
      membership_id: this.createData.membership_id,
      category_id: this.createData.category_id,
      payment_method_id: this.createData.payment_method_id,
      amount: Number(this.createData.amount),
      payment_status: this.createData.payment_status,
      ...(this.createData.transaction_reference.trim()
        ? {
            transaction_reference:
              this.createData.transaction_reference.trim(),
          }
        : {}),
      ...(this.createData.contribution_date
        ? {
            contribution_date: new Date(
              this.createData.contribution_date
            ).toISOString(),
          }
        : {}),
      ...(this.createData.notes.trim()
        ? { notes: this.createData.notes.trim() }
        : {}),
    };

    this.saving = true;
    this.errorMessage = '';

    this.financeService
      .createContribution(this.churchId, payload)
      .subscribe({
        next: (response) => {
          this.saving = false;
          this.showCreateForm = false;
          this.resetCreateForm();

          this.successMessage =
            response.message || 'Contribution recorded successfully.';

          this.currentPage = 1;
          this.cdr.markForCheck();
          this.loadContributions();
        },
        error: (error) => {
          this.saving = false;
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to record contribution.'
          );
          this.cdr.markForCheck();
        },
      });
  }

  openDetails(contribution: Contribution): void {
    this.selectedContribution = null;
    this.showDetailsModal = true;
    this.detailsLoading = true;
    this.errorMessage = '';

    this.financeService
      .getContribution(this.churchId, contribution.id)
      .subscribe({
        next: (response) => {
          this.selectedContribution = response.data;
          this.detailsLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.detailsLoading = false;
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to load contribution details.'
          );
          this.cdr.markForCheck();
        },
      });
  }

  closeDetails(): void {
    this.showDetailsModal = false;
    this.showEditForm = false;
    this.selectedContribution = null;
  }

  openEditForm(): void {
    if (!this.selectedContribution) return;

    this.editData = {
      payment_status: '',
      transaction_reference:
        this.selectedContribution.transaction_reference || '',
      notes: this.selectedContribution.notes || '',
    };

    this.showEditForm = true;
  }

  closeEditForm(): void {
    this.showEditForm = false;
  }

  updateContribution(): void {
    if (!this.selectedContribution) return;

    const payload: UpdateContributionRequest = {
      ...(this.editData.payment_status
        ? { payment_status: this.editData.payment_status }
        : {}),
      transaction_reference:
        this.editData.transaction_reference.trim() || null,
      notes: this.editData.notes.trim() || null,
    };

    this.saving = true;
    this.errorMessage = '';

    this.financeService
      .updateContribution(
        this.churchId,
        this.selectedContribution.id,
        payload
      )
      .subscribe({
        next: (response) => {
          this.saving = false;
          this.showEditForm = false;
          this.successMessage =
            response.message || 'Contribution updated successfully.';

          this.cdr.markForCheck();
          this.openDetails(this.selectedContribution!);
          this.loadContributions();
        },
        error: (error) => {
          this.saving = false;
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to update contribution.'
          );
          this.cdr.markForCheck();
        },
      });
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  formatStatus(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  formatAmount(amount: number): string {
    return Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private getErrorMessage(error: any, fallback: string): string {
    const validationIssue = error?.error?.errors?.[0];

    if (validationIssue?.message) {
      const field = Array.isArray(validationIssue.path)
        ? validationIssue.path.join('.')
        : '';

      return field
        ? `${field.replaceAll('_', ' ')}: ${validationIssue.message}`
        : validationIssue.message;
    }

    return (
      error?.error?.message ||
      error?.error?.error?.message ||
      error?.message ||
      fallback
    );
  }
}
