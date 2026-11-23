import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../../../core/service/auth.service';
import {
  FinanceService,
  FinanceCategory,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '../../../../core/service/finance.service';

@Component({
  selector: 'app-finance-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
})
export class Categories implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);

  churchId = '';
  categories: FinanceCategory[] = [];

  loading = false;
  saving = false;

  errorMessage = '';
  successMessage = '';

  searchTerm = '';
  statusFilter = 'all';

  showForm = false;
  editingCategory: FinanceCategory | null = null;

  form = {
    name: '',
    description: '',
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
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.financeService.getCategories(this.churchId).subscribe({
      next: (response) => {
        this.categories = response.data || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = this.getErrorMessage(
          error,
          'Unable to load contribution categories.'
        );
        this.cdr.markForCheck();
      },
    });
  }

  get filteredCategories(): FinanceCategory[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.categories.filter((category) => {
      const matchesSearch =
        !search ||
        category.name.toLowerCase().includes(search) ||
        (category.description || '').toLowerCase().includes(search);

      const matchesStatus =
        this.statusFilter === 'all' ||
        (this.statusFilter === 'active' && category.is_active) ||
        (this.statusFilter === 'inactive' && !category.is_active);

      return matchesSearch && matchesStatus;
    });
  }

  get activeCount(): number {
    return this.categories.filter((item) => item.is_active).length;
  }

  get inactiveCount(): number {
    return this.categories.filter((item) => !item.is_active).length;
  }

  openCreateForm(): void {
    this.editingCategory = null;
    this.form = { name: '', description: '' };
    this.errorMessage = '';
    this.showForm = true;
  }

  openEditForm(category: FinanceCategory): void {
    this.editingCategory = category;
    this.form = {
      name: category.name,
      description: category.description || '',
    };
    this.errorMessage = '';
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingCategory = null;
    this.form = { name: '', description: '' };
  }

  saveCategory(): void {
    const name = this.form.name.trim();

    if (name.length < 2 || name.length > 100) {
      this.errorMessage =
        'Category name must contain between 2 and 100 characters.';
      return;
    }

    if (this.form.description.trim().length > 1000) {
      this.errorMessage =
        'Description cannot exceed 1000 characters.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    if (this.editingCategory) {
      const payload: UpdateCategoryRequest = {
        name,
        description: this.form.description.trim() || null,
      };

      this.financeService
        .updateCategory(
          this.churchId,
          this.editingCategory.id,
          payload
          
        )
        .subscribe({
          next: (response) => {
            this.saving = false;
            this.showForm = false;
            this.successMessage =
              response.message || 'Category updated successfully.';
            this.cdr.markForCheck();
            this.loadCategories();
          },
          error: (error) => {
            this.saving = false;
            this.errorMessage = this.getErrorMessage(
              error,
              'Unable to update category.'
            );
            this.cdr.markForCheck();
          },
        });

      return;
    }

    const payload: CreateCategoryRequest = {
      name,
      description: this.form.description.trim() || null,
    };

    this.financeService
      .createCategory(this.churchId, payload)
      .subscribe({
        next: (response) => {
          this.saving = false;
          this.showForm = false;
          this.successMessage =
            response.message || 'Category created successfully.';
          this.cdr.markForCheck();
          this.loadCategories();
        },
        error: (error) => {
          this.saving = false;
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to create category.'
          );
          this.cdr.markForCheck();
        },
      });
  }

  toggleCategory(category: FinanceCategory): void {
    const nextState = !category.is_active;
    const action = nextState ? 'activate' : 'deactivate';

    if (
      !window.confirm(
        `Are you sure you want to ${action} "${category.name}"?`
      )
    ) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.financeService
      .updateCategory(this.churchId, category.id, {
        is_active: nextState,
      })
      .subscribe({
        next: (response) => {
          this.successMessage =
            response.message || `Category ${action}d successfully.`;
          this.cdr.markForCheck();
          this.loadCategories();
        },
        error: (error) => {
          this.errorMessage = this.getErrorMessage(
            error,
            `Unable to ${action} category.`
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
