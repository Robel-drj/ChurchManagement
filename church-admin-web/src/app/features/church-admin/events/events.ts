import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService, ChurchEvent, EventAction, EventStatus, EventMedia, CreateEventRequest } from '../../../core/service/event.service';
import { AuthService } from '../../../core/service/auth.service';

@Component({
  selector: 'app-church-events',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './events.html',
  styleUrl: './events.scss',
})
export class Events implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);

  churchId = '';

  events: ChurchEvent[] = [];
  selectedEvent: ChurchEvent | null = null;

  loading = false;
  saving = false;
  uploading = false;

  errorMessage = '';
  successMessage = '';

  showForm = false;
  showDetails = false;
  editing = false;

  page = 1;
  limit = 10;
  total = 0;
  totalPages = 0;

  search = '';
  statusFilter = '';

  selectedFiles: File[] = [];
  previews: { file: File; url: string; type: string }[] = [];

  form: CreateEventRequest = {
    title: '',
    description: '',
    location: '',
    start_date: '',
    end_date: ''
  };

  editingEventId: string | null = null;

  constructor(
    private eventService: EventService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const membership = this.authService.getActiveMembership();

    if (!membership?.churchId) {
      this.errorMessage = 'Please select a church first.';
      return;
    }

    this.churchId = membership.churchId;
    this.loadEvents();
  }

  loadEvents(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.eventService.getEvents(
      this.churchId,
      this.page,
      this.limit,
      this.search,
      this.statusFilter
    ).subscribe({
      next: (response) => {
        this.events = response.data ?? [];
        this.total = response.pagination?.total ?? 0;
        this.totalPages = response.pagination?.totalPages ?? 0;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error?.error?.message ?? 'Failed to load events.';
        this.cdr.markForCheck();
      },
    });
  }

  applyFilters(): void {
    this.page = 1;
    this.loadEvents();
  }

  resetFilters(): void {
    this.search = '';
    this.statusFilter = '';
    this.page = 1;
    this.loadEvents();
  }

  previousPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadEvents();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadEvents();
    }
  }

  openCreateForm(): void {
    this.resetForm();
    this.editing = false;
    this.editingEventId = null;
    this.showForm = true;
    this.showDetails = false;
    this.selectedEvent = null;
  }

  openEditForm(event: ChurchEvent): void {
    this.editing = true;
    this.editingEventId = event.id;

    this.form = {
      title: event.title,
      description: event.description ?? '',
      location: event.location ?? '',
      start_date: this.toLocalInput(event.start_date),
      end_date: event.end_date
        ? this.toLocalInput(event.end_date)
        : ''
    };

    this.clearSelectedFiles();
    this.showDetails = false;
    this.showForm = true;
    this.selectedEvent = null;
  }

  toLocalInput(date: string): string {
    const d = new Date(date);

    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);

    return local.toISOString().slice(0, 16);
  }

  closeForm(): void {
    this.showForm = false;
    this.resetForm();
    this.editing = false;
    this.editingEventId = null;
  }

  resetForm(): void {
    this.form = {
      title: '',
      description: '',
      location: '',
      start_date: '',
      end_date: ''
    };

    this.clearSelectedFiles();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    this.clearSelectedFiles();

    for (const file of files) {
      const validType =
        file.type.startsWith('image/') ||
        file.type.startsWith('video/');

      if (!validType) {
        this.errorMessage = `Unsupported file: ${file.name}`;
        continue;
      }

      this.selectedFiles.push(file);

      this.previews.push({
        file,
        url: URL.createObjectURL(file),
        type: file.type.startsWith('video/') ? 'video' : 'image'
      });
    }

    input.value = '';
  }

  removeSelectedFile(index: number): void {
    const preview = this.previews[index];

    if (preview) {
      URL.revokeObjectURL(preview.url);
      this.previews.splice(index, 1);
      this.selectedFiles.splice(index, 1);
    }
  }

  clearSelectedFiles(): void {
    this.previews.forEach(preview => URL.revokeObjectURL(preview.url));
    this.previews = [];
    this.selectedFiles = [];
  }

  saveEvent(): void {
    if (this.saving) return;

    const title = this.form.title.trim();

    if (title.length < 2) {
      this.errorMessage = 'Event title must be at least 2 characters.';
      return;
    }

    if (!this.form.start_date) {
      this.errorMessage = 'Event start date is required.';
      return;
    }

    if (this.form.end_date && this.form.end_date < this.form.start_date) {
      this.errorMessage = 'End date cannot be earlier than start date.';
      return;
    }

    const payload: CreateEventRequest = {
      title,
      description: this.form.description?.trim() || undefined,
      location: this.form.location?.trim() || undefined,
      start_date: new Date(this.form.start_date).toISOString(),
      end_date: this.form.end_date
        ? new Date(this.form.end_date).toISOString()
        : undefined
    };

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.editing && this.editingEventId) {
      this.eventService.updateEvent(
        this.churchId,
        this.editingEventId,
        payload
      ).subscribe({
        next: (response) => {
          this.finishSave(response.data.id);
        },
        error: (error) => {
          this.saving = false;
          this.errorMessage =
            error?.error?.message ?? 'Failed to update event.';
          this.cdr.markForCheck();
        },
      });
    } else {
      this.eventService.createEvent(
        this.churchId,
        payload
      ).subscribe({
        next: (response) => {
          this.finishSave(response.data.id);
        },
        error: (error) => {
          this.saving = false;
          this.errorMessage =
            error?.error?.message ?? 'Failed to create event.';
          this.cdr.markForCheck();
        },
      });
    }
  }

  finishSave(eventId: string): void {
    if (this.selectedFiles.length > 0) {
      this.uploading = true;
      this.cdr.markForCheck();

      this.eventService.uploadEventMedia(
        this.churchId,
        eventId,
        this.selectedFiles
      ).subscribe({
        next: () => {
          this.uploading = false;
          this.saving = false;
          this.closeForm();
          this.successMessage = 'Event saved with media successfully.';
          this.loadEvents();
        },
        error: (error) => {
          this.uploading = false;
          this.saving = false;
          this.errorMessage =
            error?.error?.message ??
            'Event saved, but media upload failed. Edit the event to retry.';
          this.closeForm();
          this.loadEvents();
        },
      });
    } else {
      this.saving = false;
      this.closeForm();
      this.successMessage = 'Event saved successfully.';
      this.loadEvents();
    }
  }

  openDetails(event: ChurchEvent): void {
    this.eventService.getEvent(this.churchId, event.id).subscribe({
      next: (response) => {
        this.selectedEvent = response.data;
        this.showDetails = true;
        this.showForm = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.message ?? 'Failed to load event details.';
        this.cdr.markForCheck();
      },
    });
  }

  closeDetails(): void {
    this.showDetails = false;
    this.selectedEvent = null;
  }

  performAction(event: ChurchEvent, action: EventAction): void {
    const actionLabel = action.replace('-', ' ');

    if (!window.confirm(`Are you sure you want to ${actionLabel} this event?`)) {
      return;
    }

    this.eventService.updateEventStatus(
      this.churchId,
      event.id,
      action
    ).subscribe({
      next: () => {
        this.successMessage = `Event ${actionLabel} successfully.`;
        this.showDetails = false;
        this.selectedEvent = null;
        this.loadEvents();
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.message ?? `Failed to ${actionLabel} event.`;
        this.cdr.markForCheck();
      },
    });
  }

  deleteEvent(event: ChurchEvent): void {
    if (!window.confirm(`Delete event "${event.title}" permanently?`)) {
      return;
    }

    this.eventService.deleteEvent(
      this.churchId,
      event.id
    ).subscribe({
      next: () => {
        this.successMessage = 'Event deleted successfully.';
        this.showDetails = false;
        this.selectedEvent = null;
        this.loadEvents();
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.message ?? 'Failed to delete event.';
        this.cdr.markForCheck();
      },
    });
  }

  deleteMedia(media: EventMedia): void {
    if (!this.selectedEvent) return;

    if (!window.confirm('Remove this media file from the event?')) {
      return;
    }

    this.eventService.deleteEventMedia(
      this.churchId,
      this.selectedEvent.id,
      media.id
    ).subscribe({
      next: (response) => {
        this.selectedEvent = response.data;
        this.cdr.markForCheck();
        this.loadEvents();
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.message ?? 'Failed to remove event media.';
        this.cdr.markForCheck();
      },
    });
  }

  getStatusClass(status: EventStatus): string {
    return `status-${status}`;
  }

  trackByEvent(index: number, event: ChurchEvent): string {
    return event.id;
  }

  trackByMedia(index: number, media: EventMedia): string {
    return media.id;
  }
}
