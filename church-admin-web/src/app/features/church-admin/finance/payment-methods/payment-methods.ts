import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../../../core/service/auth.service';
import {
  FinanceService,
  FinancePaymentMethod,
  CreatePaymentMethodRequest,
  UpdatePaymentMethodRequest,
} from '../../../../core/service/finance.service';

@Component({
  selector: 'app-payment-methods',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-methods.html',
  styleUrl: './payment-methods.scss',
})
export class PaymentMethods implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);

  churchId = '';
  paymentMethods: FinancePaymentMethod[] = [];

  loading = false;
  saving = false;

  errorMessage = '';
  successMessage = '';

  searchTerm = '';
  showForm = false;
  editingMethod: FinancePaymentMethod | null = null;

  form = {
    method_name: '',
    provider: '',
    account_name: '',
    account_number: '',
    instructions: '',
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
    this.loadPaymentMethods();
  }

  loadPaymentMethods(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.financeService.getPaymentMethods(this.churchId).subscribe({
      next: (response) => {
        this.paymentMethods = response.data || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = this.getErrorMessage(
          error,
          'Unable to load payment methods.'
        );
        this.cdr.markForCheck();
      },
    });
  }

  get filteredMethods(): FinancePaymentMethod[] {
    const search = this.searchTerm.trim().toLowerCase();

    if (!search) return this.paymentMethods;

    return this.paymentMethods.filter((method) =>
      [
        method.method_name,
        method.provider || '',
        method.account_name || '',
        method.account_number || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(search)
    );
  }

  openCreateForm(): void {
    this.editingMethod = null;
    this.resetForm();
    this.errorMessage = '';
    this.showForm = true;
  }

  openEditForm(method: FinancePaymentMethod): void {
    this.editingMethod = method;

    this.form = {
      method_name: method.method_name,
      provider: method.provider || '',
      account_name: method.account_name || '',
      account_number: method.account_number || '',
      instructions: method.instructions || '',
    };

    this.errorMessage = '';
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingMethod = null;
    this.resetForm();
  }

  resetForm(): void {
    this.form = {
      method_name: '',
      provider: '',
      account_name: '',
      account_number: '',
      instructions: '',
    };
  }

  savePaymentMethod(): void {
    const name = this.form.method_name.trim();

    if (name.length < 2 || name.length > 100) {
      this.errorMessage =
        'Payment method name must contain between 2 and 100 characters.';
      return;
    }

    if (this.form.provider.length > 150) {
      this.errorMessage = 'Provider cannot exceed 150 characters.';
      return;
    }

    if (this.form.account_name.length > 150) {
      this.errorMessage = 'Account name cannot exceed 150 characters.';
      return;
    }

    if (this.form.account_number.length > 100) {
      this.errorMessage = 'Account number cannot exceed 100 characters.';
      return;
    }

    if (this.form.instructions.length > 2000) {
      this.errorMessage = 'Instructions cannot exceed 2000 characters.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const optionalFields = {
      provider: this.form.provider.trim() || null,
      account_name: this.form.account_name.trim() || null,
      account_number: this.form.account_number.trim() || null,
      instructions: this.form.instructions.trim() || null,
    };

    if (this.editingMethod) {
      const payload: UpdatePaymentMethodRequest = {
        method_name: name,
        ...optionalFields,
      };

      this.financeService
        .updatePaymentMethod(
          this.churchId,
          this.editingMethod.id,
          
          payload
        )
        .subscribe({
          next: (response) => {
            this.saving = false;
            this.showForm = false;
            this.successMessage =
              response.message || 'Payment method updated successfully.';
            this.cdr.markForCheck();
            this.loadPaymentMethods();
          },
          error: (error) => {
            this.saving = false;
            this.errorMessage = this.getErrorMessage(
              error,
              'Unable to update payment method.'
            );
            this.cdr.markForCheck();
          },
        });

      return;
    }

    const payload: CreatePaymentMethodRequest = {
      method_name: name,
      ...optionalFields,
    };

    this.financeService
      .createPaymentMethod(this.churchId, payload)
      .subscribe({
        next: (response) => {
          this.saving = false;
          this.showForm = false;
          this.successMessage =
            response.message || 'Payment method created successfully.';
          this.cdr.markForCheck();
          this.loadPaymentMethods();
        },
        error: (error) => {
          this.saving = false;
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to create payment method.'
          );
          this.cdr.markForCheck();
        },
      });
  }

  deactivateMethod(method: FinancePaymentMethod): void {
    if (
      !window.confirm(
        `Are you sure you want to deactivate "${method.method_name}"?`
      )
    ) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.financeService
      .updatePaymentMethod(this.churchId, method.id, {
        is_active: false,
      })
      .subscribe({
        next: (response) => {
          this.successMessage =
            response.message || 'Payment method deactivated successfully.';
          this.cdr.markForCheck();
          this.loadPaymentMethods();
        },
        error: (error) => {
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to deactivate payment method.'
          );
          this.cdr.markForCheck();
        },
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
