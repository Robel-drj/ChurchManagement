
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import {
  PlatformService,
  PlatformChurch,
  ChurchStatus,
  DashboardSummary,
} from '../../../core/service/platform.service';
import { AuthService } from '../../../core/service/auth.service';
import {
  ChangeDetectorRef,
} from '@angular/core';
@Component({
  selector: 'app-platform-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly platformService = inject(PlatformService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
private readonly cdr = inject(ChangeDetectorRef);
  userName =
    this.authService.getCurrentUser()?.fullName ?? 'Administrator';

  summary: DashboardSummary = {
    totalChurches: 0,
    activeChurches: 0,
    pendingChurches: 0,
    suspendedChurches: 0,
  };

  churches: PlatformChurch[] = [];

  loadingSummary = false;
  loadingChurches = false;
  errorMessage = '';
  successMessage = '';

  search = '';
  selectedStatus: ChurchStatus | '' = '';

  limit = 10;
  offset = 0;
  returned = 0;

  ngOnInit(): void {
    this.loadDashboard();
    this.cdr.markForCheck();
  }

  loadDashboard(): void {
    this.loadSummary();
    this.loadChurches();
    this.cdr.markForCheck();
  }

  loadSummary(): void {
    this.loadingSummary = true;
    this.cdr.markForCheck();

    this.platformService.getDashboardSummary().subscribe({
      next: (response) => {
        this.summary = response.data;
        this.loadingSummary = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.loadingSummary = false;
        this.cdr.markForCheck();
        this.errorMessage =
          error.error?.message ?? 'Unable to load dashboard statistics.';
      },
    });
  }

  loadChurches(): void {
    this.loadingChurches = true;
    this.errorMessage = '';
this.cdr.markForCheck();
    this.platformService.getChurches(
      this.selectedStatus,
      this.search,
      this.limit,
      this.offset
    ).subscribe({
      next: (response) => {
        this.churches = response.data;
        this.returned = response.pagination.returned;
        this.loadingChurches = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.loadingChurches = false;
        this.errorMessage =
          error.error?.message ?? 'Unable to load churches.';
          this.cdr.markForCheck();
      },
    });
  }

  searchChurches(): void {
    this.offset = 0;
    this.loadChurches();
    this.cdr.markForCheck();
  }

  filterByStatus(): void {
    this.offset = 0;
    this.loadChurches();
    this.cdr.markForCheck();
  }

  nextPage(): void {
    if (this.returned < this.limit) {
      return;
    }

    this.offset += this.limit;
    this.loadChurches();
    this.cdr.markForCheck();
  }

  previousPage(): void {
    if (this.offset === 0) {
      return;
    }

    this.offset = Math.max(0, this.offset - this.limit);
    this.loadChurches();
    this.cdr.markForCheck();
  }

  get currentPage(): number {
    return Math.floor(this.offset / this.limit) + 1;
  }

  openChurch(church: PlatformChurch): void {
    this.router.navigate(['/platform-admin/churches', church.id]);
  }

  registerChurch(): void {
    this.router.navigate(['/platform-admin/churches/new']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
    this.cdr.markForCheck();
  }
}
