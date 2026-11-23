import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  AcceptedInvitation,
  AcceptInvitationRequest,
  InvitationDetails,
  InvitationService,
} from '../../../core/service/invitation.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmation = control.get('confirmPassword')?.value;

  return password === confirmation ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-accept-invitation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './accept-invitation.html',
  styleUrl: './accept-invitation.scss',
})
export class AcceptInvitation implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly invitationService = inject(InvitationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  readonly tokenForm = this.fb.nonNullable.group({
    token: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[0-9a-f]{64}$/i),
      ],
    ],
  });

  readonly acceptanceForm = this.fb.nonNullable.group(
    {
      fullName: [''],
      email: [''],
      phone: [''],
      password: ['', [Validators.required]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch }
  );

  invitation: InvitationDetails | null = null;
  acceptedInvitation: AcceptedInvitation | null = null;
  invitationToken = '';
  loadingInvitation = false;
  submitting = false;
  errorMessage = '';

  ngOnInit(): void {
    const token =
      this.route.snapshot.queryParamMap.get('token')?.trim() || '';

    if (token) {
      this.tokenForm.controls.token.setValue(token);
      this.loadInvitation(token);
    }
  }

  continueWithToken(): void {
    if (this.tokenForm.invalid || this.loadingInvitation) {
      this.tokenForm.markAllAsTouched();
      return;
    }

    const token = this.tokenForm.controls.token.value.trim();

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { token },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    this.loadInvitation(token);
  }

  submit(): void {
    if (
      !this.invitation ||
      this.acceptanceForm.invalid ||
      this.submitting
    ) {
      this.acceptanceForm.markAllAsTouched();
      return;
    }

    const value = this.acceptanceForm.getRawValue();
    const request: AcceptInvitationRequest = {
      invitationToken: this.invitationToken,
      password: value.password,
    };

    if (!this.invitation.accountExists) {
      request.fullName = value.fullName.trim();
      request.phone = value.phone.trim();

      const email = value.email.trim();
      if (email) request.email = email;
    }

    this.submitting = true;
    this.errorMessage = '';

    this.invitationService.acceptInvitation(request).subscribe({
      next: (response) => {
        this.submitting = false;
        this.acceptedInvitation = response.data;
        this.changeDetectorRef.markForCheck();
      },
      error: (error) => {
        this.submitting = false;
        this.errorMessage =
          error.error?.message ||
          'Unable to accept this invitation. Please try again.';
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  useDifferentToken(): void {
    this.invitation = null;
    this.invitationToken = '';
    this.errorMessage = '';
    this.acceptanceForm.reset();
    this.tokenForm.reset();

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { token: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private loadInvitation(token: string): void {
    this.invitation = null;
    this.acceptedInvitation = null;
    this.errorMessage = '';

    if (!/^[0-9a-f]{64}$/i.test(token)) {
      this.errorMessage =
        'This invitation link is invalid. Check the link or paste a valid token.';
      this.tokenForm.controls.token.markAsTouched();
      return;
    }

    this.invitationToken = token;
    this.loadingInvitation = true;

    this.invitationService.getInvitation(token).subscribe({
      next: (response) => {
        this.loadingInvitation = false;
        this.invitation = response.data;
        this.configureAcceptanceForm(response.data);
        this.changeDetectorRef.markForCheck();
      },
      error: (error) => {
        this.loadingInvitation = false;
        this.errorMessage =
          error.error?.message ||
          'Unable to load this invitation. It may no longer be valid.';
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  private configureAcceptanceForm(details: InvitationDetails): void {
    const controls = this.acceptanceForm.controls;

    this.acceptanceForm.reset({
      fullName: '',
      email: details.invitedEmail || '',
      phone: details.invitedPhone || '',
      password: '',
      confirmPassword: '',
    });

    if (details.accountExists) {
      controls.fullName.clearValidators();
      controls.email.clearValidators();
      controls.phone.clearValidators();
      controls.password.setValidators([
        Validators.required,
        Validators.maxLength(72),
      ]);
    } else {
      controls.fullName.setValidators([
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(150),
      ]);
      controls.email.setValidators([
        ...(details.invitedEmail ? [Validators.required] : []),
        Validators.email,
        Validators.maxLength(150),
      ]);
      controls.phone.setValidators([
        Validators.required,
        Validators.minLength(7),
        Validators.maxLength(20),
      ]);
      controls.password.setValidators([
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(72),
      ]);
    }

    controls.confirmPassword.setValidators([Validators.required]);

    Object.values(controls).forEach((control) =>
      control.updateValueAndValidity({ emitEvent: false })
    );
    this.acceptanceForm.updateValueAndValidity({ emitEvent: false });
  }
}
