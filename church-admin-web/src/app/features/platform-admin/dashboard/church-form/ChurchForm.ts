import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PlatformService } from '../../../../core/service/platform.service';

@Component({
  selector: 'app-church-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ChurchForm.html',
  styleUrl: './ChurchForm.scss',
})
export class ChurchForm {
  private readonly platformService = inject(PlatformService);
  private readonly router = inject(Router);

  form = {
    churchName: '',
    address: '',
    phone: '',
    email: '',
    logoUrl: '',
  };

  loading = false;
  errorMessage = '';
  successMessage = '';

  submitForm(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.form.churchName.trim()) {
      this.errorMessage = 'Please enter the church name.';
      return;
    }

    if (
      this.form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email.trim())
    ) {
      this.errorMessage = 'Please enter a valid email address.';
      return;
    }

    this.loading = true;

    const payload = {
      churchName: this.form.churchName.trim(),
      address: this.form.address.trim() || undefined,
      phone: this.form.phone.trim() || undefined,
      email: this.form.email.trim() || undefined,
      logoUrl: this.form.logoUrl.trim() || undefined,
    };

    this.platformService.registerChurch(payload).subscribe({
      next: (response) => {
        this.loading = false;

        if (!response.success) {
          this.errorMessage = response.message || 'Church registration failed.';
          return;
        }

        this.successMessage = 'Church registered successfully.';

        const data = response.data as {
          church?: { id: string };
          id?: string;
        };

        const churchId = data.church?.id ?? data.id;

        if (churchId) {
   this.router.navigate(['/platform-admin/dashboard']);
        } else {
          this.router.navigate(['/platform-admin/dashboard']);
        }
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error.error?.message || 'Unable to register the church. Please try again.';
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/platform-admin/dashboard']);
  }
}