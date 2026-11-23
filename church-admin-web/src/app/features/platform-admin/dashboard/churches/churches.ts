
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  PlatformService,
  PlatformChurch,
} from '../../../../core/service/platform.service';

@Component({
  selector: 'app-churches',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './churches.html',
  styleUrl: './churches.scss',
})
export class Churches implements OnInit {
  private readonly platformService = inject(PlatformService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  churches: PlatformChurch[] = [];

  loading = false;
  errorMessage = '';

  search = '';
  selectedStatus: '' | 'active' | 'pending' | 'suspended' = '';

  currentPage = 1;
  pageSize = 10;
  totalReturned = 0;

  ngOnInit(): void {
    this.loadChurches();
    this.cdr.markForCheck();
  }

  loadChurches(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();
    const offset = (this.currentPage - 1) * this.pageSize;

    this.platformService
      .getChurches(

        this.selectedStatus,
        this.search.trim(),
        this.pageSize,
        offset

      )
      .subscribe({
        next: (response) => {
          this.churches = response.data || [];
          this.totalReturned = response.pagination?.returned ?? 0;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage =
            error.error?.message || 'Unable to load churches.';
        },
      });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadChurches();
    this.cdr.markForCheck();
  }

  onStatusChange(): void {
    this.currentPage = 1;
    this.loadChurches();
    this.cdr.markForCheck();
  }

  clearFilters(): void {
    this.search = '';
    this.selectedStatus = '';
    this.currentPage = 1;
    this.loadChurches();
    this.cdr.markForCheck();
  }

  viewChurch(church: PlatformChurch): void {
    this.router.navigate([
      '/platform-admin/churches',
      church.id,
    ]);
  }

  registerChurch(): void {
    this.router.navigate(['/platform-admin/churches/new']);
  }

  changeChurchStatus(church: PlatformChurch): void {
    const newStatus =
      church.status === 'active' ? 'suspended' : 'active';

    const action =
      newStatus === 'active' ? 'activate' : 'suspend';

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${church.church_name}?`
    );

    if (!confirmed) return;

    this.platformService
      .changeChurchStatus(church.id, newStatus)
      .subscribe({
        next: () => {
          this.loadChurches();
        },
        error: (error) => {
          this.errorMessage =
            error.error?.message ||
            `Unable to ${action} church.`;
        },
      });
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

  get hasNextPage(): boolean {
    return this.churches.length === this.pageSize;
  }

  previousPage(): void {
    if (this.currentPage <= 1) return;

    this.currentPage--;
    this.loadChurches();
  }

  nextPage(): void {
    if (!this.hasNextPage) return;

    this.currentPage++;
    this.loadChurches();
    this.cdr.markForCheck();
  }
  goBack(): void {
    this.router.navigate(['/platform-admin/dashboard']);
  }
}
