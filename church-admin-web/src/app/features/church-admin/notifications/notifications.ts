import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService, ChurchNotification, NotificationType, NotificationTarget, CreateNotificationRequest } from '../../../core/service/notification.service';
import { AuthService } from '../../../core/service/auth.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
})
export class Notifications implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);

  churchId = '';

  notifications: ChurchNotification[] = [];

  loading = false;
  saving = false;
  cancelling = false;
  errorMessage = '';
  successMessage = '';

  selectedNotification: ChurchNotification | null = null;

  showCreateForm = false;
  showDetails = false;

  page = 1;
  limit = 10;
  total = 0;
  totalPages = 0;

  statusFilter = '';

  notificationTypes: { label: string; value: NotificationType }[] = [
    { label: 'General', value: 'general' },
    { label: 'Announcement', value: 'announcement' },
    { label: 'Event', value: 'event' },
    { label: 'Payment', value: 'payment' }
  ];

  form: CreateNotificationRequest = {
    title: '',
    message: '',
    notification_type: 'general',
    target_type: 'all'
  };

  selectedMembershipIdsText = '';

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const membership = this.authService.getActiveMembership();

    if (!membership?.churchId) {
      this.errorMessage = 'Please select a church first.';
      return;
    }

    this.churchId = membership.churchId;
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.notificationService.getNotifications(
      this.churchId,
      this.page,
      this.limit,
      this.statusFilter
    ).subscribe({
      next: (response) => {
        this.notifications = response.data ?? [];
        this.total = response.pagination?.total ?? 0;
        this.totalPages = response.pagination?.totalPages ?? 0;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error?.error?.message ?? 'Failed to load notifications.';
        this.cdr.markForCheck();
      },
    });
  }

  changeStatusFilter(status: string): void {
    this.statusFilter = status;
    this.page = 1;
    this.loadNotifications();
  }

  previousPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadNotifications();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadNotifications();
    }
  }

  openCreateForm(): void {
    this.resetForm();
    this.showCreateForm = true;
    this.showDetails = false;
    this.selectedNotification = null;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeCreateForm(): void {
    this.showCreateForm = false;
    this.resetForm();
  }

  resetForm(): void {
    this.form = {
      title: '',
      message: '',
      notification_type: 'general',
      target_type: 'all'
    };

    this.selectedMembershipIdsText = '';
  }

  submitNotification(): void {
    if (this.saving) return;

    const title = this.form.title.trim();
    const message = this.form.message.trim();

    if (title.length < 3 || title.length > 200) {
      this.errorMessage = 'Title must be between 3 and 200 characters.';
      return;
    }

    if (message.length < 3 || message.length > 5000) {
      this.errorMessage = 'Message must be between 3 and 5000 characters.';
      return;
    }

    const payload: CreateNotificationRequest = {
      ...this.form,
      title,
      message
    };

    if (payload.target_type === 'selected') {
      const membershipIds = this.selectedMembershipIdsText
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);

      if (!membershipIds.length) {
        this.errorMessage = 'Enter at least one membership ID.';
        return;
      }

      payload.membership_ids = membershipIds;
    } else {
      delete payload.membership_ids;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.notificationService.createNotification(
      this.churchId,
      payload
    ).subscribe({
      next: (response) => {
        this.saving = false;
        this.showCreateForm = false;
        this.resetForm();
        this.page = 1;

        this.successMessage =
          `Notification sent successfully to ${response.data.recipient_count} recipients.`;

        this.cdr.markForCheck();
        this.loadNotifications();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage =
          error?.error?.message ?? 'Failed to send notification.';
        this.cdr.markForCheck();
      },
    });
  }

  openDetails(notification: ChurchNotification): void {
    this.selectedNotification = notification;
    this.showDetails = true;
    this.showCreateForm = false;
  }

  closeDetails(): void {
    this.showDetails = false;
    this.selectedNotification = null;
  }

  cancelNotification(notification: ChurchNotification): void {
    if (notification.status !== 'sent' || this.cancelling) {
      return;
    }

    const confirmed = window.confirm(
      `Cancel this notification "${notification.title}"?`
    );

    if (!confirmed) return;

    this.cancelling = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.notificationService.cancelNotification(
      this.churchId,
      notification.id
    ).subscribe({
      next: () => {
        this.cancelling = false;
        this.showDetails = false;
        this.selectedNotification = null;
        this.successMessage = 'Notification cancelled successfully.';
        this.cdr.markForCheck();
        this.loadNotifications();
      },
      error: (error) => {
        this.cancelling = false;
        this.errorMessage =
          error?.error?.message ?? 'Failed to cancel notification.';
        this.cdr.markForCheck();
      },
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'sent':
        return 'status-sent';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-default';
    }
  }

  getTypeLabel(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  trackByNotification(
    index: number,
    notification: ChurchNotification
  ): string {
    return notification.id;
  }
}
