import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChurchMediaService, ChurchMedia } from '../../../core/service/church-media.service';
import { AuthService } from '../../../core/service/auth.service';

@Component({
  selector: 'app-church-media',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './media.html',
  styleUrl: './media.scss',
})
export class Media implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);

  churchId = '';

  media: ChurchMedia[] = [];
  selectedMedia: ChurchMedia | null = null;

  loading = false;
  errorMessage = '';

  page = 1;
  limit = 20;
  total = 0;
  totalPages = 0;

  search = '';
  sourceFilter = 'all';
  mediaTypeFilter = '';

  constructor(
    private mediaService: ChurchMediaService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const membership = this.authService.getActiveMembership();

    if (!membership?.churchId) {
      this.errorMessage = 'Please select a church first.';
      return;
    }

    this.churchId = membership.churchId;
    this.loadMedia();
  }

  loadMedia(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.mediaService.getMedia(
      this.churchId,
      this.page,
      this.limit,
      this.sourceFilter,
      this.mediaTypeFilter,
      this.search
    ).subscribe({
      next: (response) => {
        this.media = response.data ?? [];
        this.total = response.pagination?.total ?? 0;
        this.totalPages = response.pagination?.totalPages ?? 0;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error?.error?.message ?? 'Failed to load media library.';
        this.cdr.markForCheck();
      },
    });
  }

  applyFilters(): void {
    this.page = 1;
    this.loadMedia();
  }

  resetFilters(): void {
    this.search = '';
    this.sourceFilter = 'all';
    this.mediaTypeFilter = '';
    this.page = 1;
    this.loadMedia();
  }

  previousPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadMedia();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadMedia();
    }
  }

  openPreview(item: ChurchMedia): void {
    this.selectedMedia = item;
  }

  closePreview(): void {
    this.selectedMedia = null;
  }

  formatFileSize(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
  }

  trackByMedia(index: number, item: ChurchMedia): string {
    return item.id;
  }
}
