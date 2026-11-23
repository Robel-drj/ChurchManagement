
import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  PlatformService,
  PlatformChurch,
  ChurchInvitation,
} from '../../../../core/service/platform.service';

@Component({
  selector: 'app-invitations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './invitation.html',
  styleUrl: './invitation.scss',
})
export class Invitations implements OnInit {
  private readonly platformService = inject(PlatformService);
  private readonly router = inject(Router);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  churches: PlatformChurch[] = [];
  invitations: ChurchInvitation[] = [];

  selectedChurchId = '';

  invitedEmail = '';
  invitedPhone = '';

  invitationToken = '';

  loadingChurches = false;
  loadingInvitations = false;
  creating = false;
  revokingId: string | null = null;
  regeneratingId: string | null = null;

  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.loadChurches();
  }

  loadChurches(): void {
    this.loadingChurches = true;

    this.platformService.getChurches('', '', 100, 0).subscribe({
      next: (response) => {
        this.loadingChurches = false;
        this.churches = response.data || [];

        if (this.churches.length > 0) {
          this.selectedChurchId = this.churches[0].id;
          this.loadInvitations();
        }

        this.changeDetectorRef.markForCheck();
      },
      error: (error) => {
        this.loadingChurches = false;
        this.errorMessage =
          error.error?.message || 'Unable to load churches.';
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  onChurchChange(): void {
    this.invitations = [];
    this.invitationToken = '';
    this.errorMessage = '';
    this.successMessage = '';

    if (this.selectedChurchId) {
      this.loadInvitations();
    }
  }

  loadInvitations(): void {
    if (!this.selectedChurchId) return;

    this.loadingInvitations = true;

    this.platformService
      .getInvitations(this.selectedChurchId)
      .subscribe({
        next: (response) => {
          this.loadingInvitations = false;
          this.invitations = response.data || [];
          this.changeDetectorRef.markForCheck();
        },
        error: (error) => {
          this.loadingInvitations = false;
          this.errorMessage =
            error.error?.message || 'Unable to load invitations.';
          this.changeDetectorRef.markForCheck();
        },
      });
  }

  createInvitation(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.invitationToken = '';

    if (!this.selectedChurchId) {
      this.errorMessage = 'Please select a church.';
      return;
    }

    const email = this.invitedEmail.trim();
    const phone = this.invitedPhone.trim();

    if (!email && !phone) {
      this.errorMessage =
        'Enter at least an email address or phone number.';
      return;
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      this.errorMessage = 'Please enter a valid email address.';
      return;
    }

    this.creating = true;

    const payload = {
      invitedEmail: email || undefined,
      invitedPhone: phone || undefined,
    };

    this.platformService
      .createInvitation(this.selectedChurchId, payload)
      .subscribe({
        next: (response) => {
          this.creating = false;

          this.successMessage =
            response.message || 'Invitation created successfully.';

          this.invitationToken =
            response.data?.invitationToken || '';

          this.invitedEmail = '';
          this.invitedPhone = '';

          this.loadInvitations();
          this.changeDetectorRef.markForCheck();
        },
        error: (error) => {
          this.creating = false;
          this.errorMessage =
            error.error?.message || 'Unable to create invitation.';
          this.changeDetectorRef.markForCheck();
        },
      });
  }

  revokeInvitation(invitation: ChurchInvitation): void {
    if (invitation.status !== 'pending') return;

    const confirmed = window.confirm(
      'Are you sure you want to revoke this invitation?'
    );

    if (!confirmed) return;

    this.errorMessage = '';
    this.successMessage = '';
    this.revokingId = invitation.id;

    this.platformService
      .revokeInvitation(this.selectedChurchId, invitation.id)
      .subscribe({
        next: (response) => {
          this.revokingId = null;
          this.successMessage =
            response.message || 'Invitation revoked successfully.';

          this.loadInvitations();
          this.changeDetectorRef.markForCheck();
        },
        error: (error) => {
          this.revokingId = null;
          this.errorMessage =
            error.error?.message || 'Unable to revoke invitation.';
          this.changeDetectorRef.markForCheck();
        },
      });
  }

  regenerateInvitation(invitation: ChurchInvitation): void {
    if (invitation.status !== 'pending') return;

    const confirmed = window.confirm(
      'Generate a new link? Any previously shared link for this invitation will stop working.'
    );

    if (!confirmed) return;

    this.errorMessage = '';
    this.successMessage = '';
    this.invitationToken = '';
    this.regeneratingId = invitation.id;

    this.platformService
      .regenerateInvitation(this.selectedChurchId, invitation.id)
      .subscribe({
        next: (response) => {
          this.regeneratingId = null;
          this.invitationToken =
            response.data?.invitationToken || '';
          this.successMessage =
            response.message || 'A new invitation link was generated.';
          this.loadInvitations();
          this.changeDetectorRef.markForCheck();
        },
        error: (error) => {
          this.regeneratingId = null;
          this.errorMessage =
            error.error?.message || 'Unable to generate a new invitation link.';
          this.changeDetectorRef.markForCheck();
        },
      });
  }

  async copyInvitationLink(): Promise<void> {
    const link = this.invitationLink;

    if (!link) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        this.copyWithFallback(link);
      }

      this.successMessage = 'Invitation link copied.';
      this.errorMessage = '';
    } catch {
      try {
        this.copyWithFallback(link);
        this.successMessage = 'Invitation link copied.';
        this.errorMessage = '';
      } catch {
        this.errorMessage =
          'Unable to copy automatically. Select the link and copy it manually.';
      }
    }

    this.changeDetectorRef.markForCheck();
  }

  get invitationLink(): string {
    if (!this.invitationToken) return '';

    const path = this.router.serializeUrl(
      this.router.createUrlTree(['/accept-invitation'], {
        queryParams: { token: this.invitationToken },
      })
    );

    return new URL(path, window.location.origin).toString();
  }

  get selectedChurchName(): string {
    return this.churches.find(
      church => church.id === this.selectedChurchId
    )?.church_name || '';
  }

  private copyWithFallback(value: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = value;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();

    const copied = document.execCommand('copy');
    textArea.remove();

    if (!copied) {
      throw new Error('Copy command was rejected.');
    }
  }
}
