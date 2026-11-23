import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { of, switchMap, tap } from 'rxjs';

import { AuthService } from '../../../core/service/auth.service';
import {
  ChurchProfileService,
  ChurchProfile,
  UpdateChurchProfileRequest,
} from '../../../core/service/church-profile.service';

@Component({
  selector: 'app-church-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);

  churchId = '';
  profile: ChurchProfile | null = null;

  loading = false;
  saving = false;
  editing = false;

  errorMessage = '';
  successMessage = '';

  selectedLogoFile: File | null = null;
  localLogoPreviewUrl = '';

  form = {
    church_name: '',
    address: '',
    phone: '',
    email: '',
    logo_url: '',
  };

  constructor(
    private authService: AuthService,
    private profileService: ChurchProfileService
  ) {}

  ngOnInit(): void {
    const membership = this.authService.getActiveMembership();

    if (!membership?.churchId) {
      this.errorMessage = 'No active church membership was found.';
      return;
    }

    this.churchId = membership.churchId;
    this.loadProfile();
  }

  ngOnDestroy(): void {
    this.clearLocalLogoSelection(false);
  }

  loadProfile(): void {
    this.loading = true;
    this.errorMessage = '';

    this.profileService.getProfile(this.churchId).subscribe({
      next: (response) => {
        this.profile = response.data;
        this.copyProfileToForm();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = this.getErrorMessage(
          error,
          'Unable to load church profile.'
        );
        this.cdr.markForCheck();
      },
    });
  }

  startEditing(): void {
    if (!this.profile) return;

    this.clearLocalLogoSelection();
    this.copyProfileToForm();
    this.editing = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();
  }

  cancelEditing(): void {
    this.clearLocalLogoSelection();
    this.copyProfileToForm();
    this.editing = false;
    this.cdr.markForCheck();
  }

  get logoPreviewUrl(): string {
    return this.localLogoPreviewUrl || this.form.logo_url;
  }

  onLogoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const allowedTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
    ]);

    if (!allowedTypes.has(file.type)) {
      this.errorMessage = 'Select a JPEG, PNG, or WebP profile photo.';
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage = 'The profile photo cannot exceed 5 MB.';
      input.value = '';
      return;
    }

    this.clearLocalLogoSelection();
    this.selectedLogoFile = file;
    this.localLogoPreviewUrl = URL.createObjectURL(file);
    this.errorMessage = '';
  }

  removeLogo(): void {
    this.clearLocalLogoSelection();
    this.form.logo_url = '';
  }

  saveProfile(): void {
    if (!this.form.church_name.trim()) {
      this.errorMessage = 'Church name is required.';
      return;
    }

    if (this.form.church_name.trim().length < 2) {
      this.errorMessage = 'Church name must contain at least 2 characters.';
      return;
    }

    const payload: UpdateChurchProfileRequest = {
      church_name: this.form.church_name.trim(),
      address: this.form.address.trim() || null,
      phone: this.form.phone.trim() || null,
      email: this.form.email.trim() || null,
      logo_url: this.form.logo_url.trim() || null,
    };
    const selectedLogoFile = this.selectedLogoFile;
    let detailsSaved = false;

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.profileService
      .updateProfile(this.churchId, payload)
      .pipe(
        tap(() => {
          detailsSaved = true;
        }),
        switchMap((response) =>
          selectedLogoFile
            ? this.profileService.uploadLogo(this.churchId, selectedLogoFile)
            : of(response)
        )
      )
      .subscribe({
        next: (response) => {
          this.profile = response.data;
          this.clearLocalLogoSelection();
          this.copyProfileToForm();
          this.editing = false;
          this.saving = false;
          this.successMessage = selectedLogoFile
            ? 'Church profile and photo updated successfully.'
            : response.message || 'Church profile updated successfully.';
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.saving = false;
          this.errorMessage = this.getErrorMessage(
            error,
            detailsSaved && selectedLogoFile
              ? 'Church details were saved, but the profile photo upload failed.'
              : 'Unable to update church profile.'
          );
          this.cdr.markForCheck();
        },
      });
  }

  private copyProfileToForm(): void {
    if (!this.profile) return;

    this.form = {
      church_name: this.profile.church_name || '',
      address: this.profile.address || '',
      phone: this.profile.phone || '',
      email: this.profile.email || '',
      logo_url: this.profile.logo_url || '',
    };
  }

  private clearLocalLogoSelection(refreshView = true): void {
    const previewUrl = this.localLogoPreviewUrl;
    this.localLogoPreviewUrl = '';
    this.selectedLogoFile = null;

    if (previewUrl) {
      if (refreshView) {
        this.cdr.detectChanges();
      }

      URL.revokeObjectURL(previewUrl);
    }
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
