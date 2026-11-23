import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  PlatformService,
  PlatformAuditLog,
} from '../../../core/service/platform.service';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-logs.html',
  styleUrl: './audit-logs.scss',
})
export class AuditLogs implements OnInit {
   private readonly cdr = inject(ChangeDetectorRef);
  logs: PlatformAuditLog[] = [];

  search = '';
  selectedAction = '';

  limit = 20;
  offset = 0;
  total = 0;

  loading = false;
  errorMessage = '';

  readonly actions = [
    { value: 'church.created', label: 'Church Created' },
    { value: 'church.updated', label: 'Church Updated' },
    { value: 'church.activated', label: 'Church Activated' },
    { value: 'church.suspended', label: 'Church Suspended' },
    { value: 'invitation.created', label: 'Invitation Created' },
    { value: 'invitation.revoked', label: 'Invitation Revoked' },
  ];

  constructor(
    private platformService: PlatformService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAuditLogs();
          this.cdr.markForCheck();
  }

  loadAuditLogs(): void {
    this.loading = true;
    this.errorMessage = '';
      this.cdr.markForCheck();
    this.platformService
      .getAuditLogs(
        
        this.limit,
        this.offset,
        this.search,
        this.selectedAction,
        
        
      )
      .subscribe({
        next: (response) => {
          this.logs = response.data ?? [];
          this.total = response.pagination?.total ?? 0;
          this.loading = false;
                this.cdr.markForCheck();
        },
        error: (error) => {
          this.loading = false;
                this.cdr.markForCheck();
          this.errorMessage =
            error?.error?.message || 'Unable to load audit logs.';
        },
      });
  }

  searchLogs(): void {
    this.offset = 0;
    this.loadAuditLogs();
          this.cdr.markForCheck();
  }

  filterByAction(): void {
    this.offset = 0;
    this.loadAuditLogs();
          this.cdr.markForCheck();
  }

  previousPage(): void {
    if (this.offset === 0) return;

    this.offset = Math.max(0, this.offset - this.limit);
    this.loadAuditLogs();
          this.cdr.markForCheck();
  }

  nextPage(): void {
    if (this.offset + this.limit >= this.total) return;

    this.offset += this.limit;
    this.loadAuditLogs();
          this.cdr.markForCheck();
  }

  get currentPage(): number {
    return this.total === 0
      ? 0
      : Math.floor(this.offset / this.limit) + 1;
  }

  get totalPages(): number {
    return Math.ceil(this.total / this.limit);
  }

  formatAction(action: string): string {
    return action
      .split('.')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  formatDetails(details: Record<string, unknown> | null): string {
    return details ? JSON.stringify(details, null, 2) : 'No additional details';
  }

  trackById(_index: number, log: PlatformAuditLog): string {
    return log.id;
  }
   goBack(): void {
    this.router.navigate(['/platform-admin/dashboard']);
  }
}