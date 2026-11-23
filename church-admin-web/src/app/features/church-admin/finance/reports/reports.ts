import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../../../core/service/auth.service';
import {
  FinanceService,
  FinanceReportData,
} from '../../../../core/service/finance.service';

@Component({
  selector: 'app-finance-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);

  churchId = '';

  report: FinanceReportData | null = null;

  loading = false;
  errorMessage = '';

  dateFrom = '';
  dateTo = '';

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
    this.loadReport();
  }

  loadReport(): void {
    if (
      this.dateFrom &&
      this.dateTo &&
      this.dateFrom > this.dateTo
    ) {
      this.errorMessage = 'Start date cannot be later than end date.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.financeService
      .getFinanceReport(this.churchId, this.dateFrom, this.dateTo)
      .subscribe({
        next: (response) => {
          this.report = response.data;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to generate financial report.'
          );
          this.cdr.markForCheck();
        },
      });
  }

  clearDateFilter(): void {
    this.dateFrom = '';
    this.dateTo = '';
    this.loadReport();
  }

  formatAmount(amount: number | string | null | undefined): string {
    const value = Number(amount || 0);

    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  get maxCategoryAmount(): number {
    if (!this.report?.by_category.length) return 0;

    return Math.max(
      ...this.report.by_category.map((item) =>
        Number(item.confirmed_amount || 0)
      ),
      0
    );
  }

  get maxPaymentMethodAmount(): number {
    if (!this.report?.by_payment_method.length) return 0;

    return Math.max(
      ...this.report.by_payment_method.map((item) =>
        Number(item.confirmed_amount || 0)
      ),
      0
    );
  }

  get maxDailyAmount(): number {
    if (!this.report?.daily_activity.length) return 0;

    return Math.max(
      ...this.report.daily_activity.map((item) =>
        Number(item.confirmed_amount || 0)
      ),
      0
    );
  }

  categoryWidth(amount: number | string): number {
    if (!this.maxCategoryAmount) return 0;

    return Math.max(
      0,
      (Number(amount) / this.maxCategoryAmount) * 100
    );
  }

  paymentMethodWidth(amount: number | string): number {
    if (!this.maxPaymentMethodAmount) return 0;

    return Math.max(
      0,
      (Number(amount) / this.maxPaymentMethodAmount) * 100
    );
  }

  dailyWidth(amount: number | string): number {
    if (!this.maxDailyAmount) return 0;

    return Math.max(
      0,
      (Number(amount) / this.maxDailyAmount) * 100
    );
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
