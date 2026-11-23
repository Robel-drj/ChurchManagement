import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  PlatformService,
  PlatformChurch,
  ChurchStatus,
} from '../../../../core/service/platform.service';

@Component({
  selector: 'app-church-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ChurchDetail.html',
  styleUrl: './ChurchDetail.scss',
})
export class ChurchDetails implements OnInit {
  private readonly platformService = inject(PlatformService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  churchId = '';

  church: PlatformChurch | null = null;

  form = {
    churchName: '',
    address: '',
    phone: '',
    email: '',
    logoUrl: '',
  };

  loading = false;
  saving = false;
  changingStatus = false;

  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.churchId = this.route.snapshot.paramMap.get('churchId') || '';

    if (!this.churchId) {
      this.errorMessage = 'Church ID was not provided.';
      return;
    }

    this.loadChurch();
  }

  loadChurch(): void {
    this.loading = true;
    this.errorMessage = '';

    this.platformService
      .getChurch(this.churchId)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.errorMessage = 'Unable to load church information.';
            return;
          }

          // Supports either { data: church } or { data: { church } }.
          const result = response.data as any;
          const church = result?.church ?? result;

          if (!church?.id) {
            this.errorMessage = 'The server returned invalid church information.';
            return;
          }

          this.church = church as PlatformChurch;

          this.form = {
            churchName: church.church_name || '',
            address: church.address || '',
            phone: church.phone || '',
            email: church.email || '',
            logoUrl: church.logo_url || '',
          };
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Unable to load church information.';
        },
      });
  }

  saveChanges(): void {
    if (!this.church) return;

    this.errorMessage = '';
    this.successMessage = '';

    if (!this.form.churchName.trim()) {
      this.errorMessage = 'Church name is required.';
      return;
    }

    if (this.form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email.trim())) {
      this.errorMessage = 'Please enter a valid email address.';
      return;
    }

    this.saving = true;

    const payload = {
      churchName: this.form.churchName.trim(),
      address: this.form.address.trim(),
      phone: this.form.phone.trim(),
      email: this.form.email.trim(),
      logoUrl: this.form.logoUrl.trim(),
    };

    this.platformService
      .updateChurch(this.churchId, payload)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.errorMessage = response.message || 'Unable to update church.';
            return;
          }

          this.successMessage = 'Church information updated successfully.';
          this.loadChurch();
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Unable to update church information.';
        },
      });
  }

  changeStatus(status: 'active' | 'suspended'): void {
    if (!this.church || this.changingStatus) return;

    const action = status === 'active' ? 'activate' : 'suspend';

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${this.church.church_name}?`,
    );

    if (!confirmed) return;

    this.errorMessage = '';
    this.successMessage = '';
    this.changingStatus = true;

    this.platformService
      .changeChurchStatus(this.churchId, status)
      .pipe(
        finalize(() => {
          this.changingStatus = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.errorMessage = response.message || `Unable to ${action} church.`;
            return;
          }

          this.successMessage =
            status === 'active'
              ? 'Church activated successfully.'
              : 'Church suspended successfully.';

          this.loadChurch();
        },
        error: (error) => {
          this.errorMessage = error.error?.message || `Unable to ${action} church.`;
        },
      });
  }

  get statusClass(): string {
    return this.church?.status || 'pending';
  }

  goBack(): void {
    this.router.navigate(['/platform-admin/dashboard']);
  }
}
