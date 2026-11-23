import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../core/service/auth.service';
import {
  ChurchPost,
  ContentService,
} from '../../core/service/content.service';

@Component({
  selector: 'app-content-creator-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class ContentCreatorDashboard implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);

  loading = true;
  error = '';

  churchId = '';

  totalPosts = 0;
  publishedPosts = 0;
  draftPosts = 0;
  archivedPosts = 0;

  recentPosts: ChurchPost[] = [];

  constructor(
    private authService: AuthService,
    private contentService: ContentService
  ) {}

  ngOnInit(): void {
    const membership = this.authService.getActiveMembership();

    if (!membership?.churchId) {
      this.error = 'No active church selected.';
      this.loading = false;
      return;
    }

    this.churchId = membership.churchId;
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      recent: this.contentService.getPosts(this.churchId, 1, 5),
      published: this.contentService.getPosts(
        this.churchId,
        1,
        1,
        '',
        '',
        'published'
      ),
      draft: this.contentService.getPosts(
        this.churchId,
        1,
        1,
        '',
        '',
        'draft'
      ),
      archived: this.contentService.getPosts(
        this.churchId,
        1,
        1,
        '',
        '',
        'archived'
      ),
    }).subscribe({
      next: ({ recent, published, draft, archived }) => {
        this.totalPosts = recent.data.pagination.total;
        this.publishedPosts = published.data.pagination.total;
        this.draftPosts = draft.data.pagination.total;
        this.archivedPosts = archived.data.pagination.total;
        this.recentPosts = recent.data.posts ?? [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.error =
          error?.error?.message ?? 'Unable to load content dashboard.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}
