import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  FinanceReportData,
  FinanceReportTotals,
  FinanceService,
} from '../../../core/service/finance.service';
import { AuthService } from '../../../core/service/auth.service';

@Component({
  selector: 'app-money-collector-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class MoneyCollectorDashboard implements OnInit {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  churchId = '';
  churchName = '';

  loading = false;
  errorMessage = '';

  dateFrom = '';
  dateTo = '';

  report: FinanceReportData | null = null;

  constructor(
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
    this.loadDashboard();
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

  loadDashboard(): void {
    if (this.dateFrom && this.dateTo && this.dateFrom > this.dateTo) {
      this.errorMessage = 'Start date cannot be after end date.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.financeService.getFinanceReport(
      this.churchId,
      this.dateFrom,
      this.dateTo
    ).subscribe({
      next: (response) => {
        this.report = response.data;
        this.loading = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error?.error?.message ?? 'Failed to load financial dashboard.';
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  resetDateRange(): void {
    this.setDefaultDates();
    this.loadDashboard();
  }

  get totals(): FinanceReportTotals | null {
    return this.report?.totals ?? null;
  }

  get totalCollected(): number {
    return Number(this.totals?.confirmed_amount ?? 0);
  }

  get pendingAmount(): number {
    return Number(this.totals?.pending_amount ?? 0);
  }

  get totalTransactions(): number {
    return this.totals?.total_contributions ?? 0;
  }

  get confirmedCount(): number {
    return this.totals?.confirmed_count ?? 0;
  }

  get pendingCount(): number {
    return this.totals?.pending_count ?? 0;
  }

  formatAmount(amount: number | string | null | undefined): string {
    const value = Number(amount ?? 0);

    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);
  }
}
