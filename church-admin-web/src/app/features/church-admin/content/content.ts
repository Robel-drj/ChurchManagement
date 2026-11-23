import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../../core/service/auth.service';
import {
  ContentService,
  ChurchPost,
  PostMedia,
  PostType,
  CreatePostRequest,
  UpdatePostRequest,
} from '../../../core/service/content.service';

@Component({
  selector: 'app-church-content',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './content.html',
  styleUrl: './content.scss',
})
export class Content implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);

  churchId = '';

  posts: ChurchPost[] = [];
  selectedPost: ChurchPost | null = null;
selectedFiles: File[] = [];
mediaPreviews: { file: File; url: string; type: 'image' | 'video' }[] = [];
  loading = false;
  detailsLoading = false;
  saving = false;
  uploading = false;

  errorMessage = '';
  successMessage = '';

  searchTerm = '';
  postTypeFilter = '';
  statusFilter = '';

  currentPage = 1;
  pageSize = 20;
  total = 0;
  totalPages = 0;

  showForm = false;
  showDetails = false;
  editingPost: ChurchPost | null = null;

 

  form = {
    title: '',
    content: '',
    post_type: 'announcement' as PostType,
  };

  readonly allowedTypes: PostType[] = [
    'announcement',
    'news',
    'teaching',
    'notice',
    'other',
  ];

  constructor(
    private authService: AuthService,
    private contentService: ContentService
  ) {}

  ngOnInit(): void {
    const membership = this.authService.getActiveMembership();

    if (!membership?.churchId) {
      this.errorMessage = 'No active church membership was found.';
      return;
    }

    this.churchId = membership.churchId;
    this.loadPosts();
  }
editSelectedPost(): void {
  if (!this.selectedPost) return;

  const post = this.selectedPost;
  this.closeDetails();
  this.openEditForm(post);
}
  loadPosts(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.contentService
      .getPosts(
        this.churchId,
        this.currentPage,
        this.pageSize,
        this.searchTerm,
        this.postTypeFilter,
        this.statusFilter
      )
      .subscribe({
        next: (response) => {
          this.posts = response.data.posts || [];
          this.total = response.data.pagination.total;
          this.totalPages = response.data.pagination.total_pages;
          this.currentPage = response.data.pagination.page;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to load church posts.'
          );
          this.cdr.markForCheck();
        },
      });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadPosts();
  }
onCreateFilesSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files || []);

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
  ];

  if (this.selectedFiles.length + files.length > 10) {
    this.errorMessage = 'You can select a maximum of 10 files.';
    input.value = '';
    return;
  }

  if (files.some(file => !allowedTypes.includes(file.type))) {
    this.errorMessage = 'Unsupported image or video format.';
    input.value = '';
    return;
  }

  if (files.some(file =>
    file.type.startsWith('image/') &&
    file.size > 10 * 1024 * 1024
  )) {
    this.errorMessage = 'Each image must be 10 MB or smaller.';
    input.value = '';
    return;
  }

  const combined = [...this.selectedFiles, ...files];
  const totalSize = combined.reduce((sum, file) => sum + file.size, 0);

  if (totalSize > 100 * 1024 * 1024) {
    this.errorMessage = 'Total upload size cannot exceed 100 MB.';
    input.value = '';
    return;
  }

  this.errorMessage = '';
  this.selectedFiles = combined;
  this.refreshMediaPreviews();
  input.value = '';
}

refreshMediaPreviews(): void {
  this.mediaPreviews.forEach(item => URL.revokeObjectURL(item.url));

  this.mediaPreviews = this.selectedFiles.map(file => ({
    file,
    url: URL.createObjectURL(file),
    type: file.type.startsWith('video/') ? 'video' : 'image',
  }));
}

removeCreateFile(index: number): void {
  this.selectedFiles.splice(index, 1);
  this.refreshMediaPreviews();
}

clearCreateFiles(): void {
  this.mediaPreviews.forEach(item => URL.revokeObjectURL(item.url));
  this.mediaPreviews = [];
  this.selectedFiles = [];
}
  clearFilters(): void {
    this.searchTerm = '';
    this.postTypeFilter = '';
    this.statusFilter = '';
    this.currentPage = 1;
    this.loadPosts();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.currentPage = page;
    this.loadPosts();
  }

  getPageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  openCreateForm(): void {
    this.editingPost = null;
    this.resetForm();
    this.errorMessage = '';
    this.showForm = true;
  }

  openEditForm(post: ChurchPost): void {
    this.editingPost = post;
    this.form = {
      title: post.title,
      content: post.content,
      post_type: post.post_type,
    };

    this.errorMessage = '';
    this.showForm = true;
  }

closeForm(): void {
  this.showForm = false;
  this.editingPost = null;
  this.resetForm();
  this.clearCreateFiles();
}

  resetForm(): void {
    this.form = {
      title: '',
      content: '',
      post_type: 'announcement',
    };
  }

 savePost(): void {
  const title = this.form.title.trim();
  const content = this.form.content.trim();

  if (title.length < 2 || title.length > 200) {
    this.errorMessage = 'Title must contain between 2 and 200 characters.';
    return;
  }

  if (!content || content.length > 20000) {
    this.errorMessage = 'Content is required and cannot exceed 20,000 characters.';
    return;
  }

  this.saving = true;
  this.errorMessage = '';

  const payload = {
    title,
    content,
    post_type: this.form.post_type,
  };

  if (this.editingPost) {
    const postId = this.editingPost.id;

    this.contentService.updatePost(
      this.churchId,
      postId,
      payload
    ).subscribe({
      next: () => {
        if (this.selectedFiles.length > 0) {
          this.uploadFilesAfterSave(postId);
        } else {
          this.finishPostSave('Post updated successfully.');
        }
      },
       error: (error) => {
         this.saving = false;
         this.errorMessage = this.getErrorMessage(
           error,
           'Unable to update post.'
         );
         this.cdr.markForCheck();
       },
    });

    return;
  }

  this.contentService.createPost(this.churchId, payload).subscribe({
    next: (response) => {
      const postId = response.data.id;

      if (this.selectedFiles.length > 0) {
        this.uploadFilesAfterSave(postId);
      } else {
        this.finishPostSave('Post created successfully.');
      }
    },
    error: (error) => {
      this.saving = false;
      this.errorMessage = this.getErrorMessage(
        error,
        'Unable to create post.'
      );
      this.cdr.markForCheck();
    },
  });
}

private uploadFilesAfterSave(postId: string): void {
  this.contentService.uploadMedia(
    this.churchId,
    postId,
    this.selectedFiles
  ).subscribe({
    next: () => {
      this.finishPostSave(
        'Post saved and media uploaded successfully.'
      );
    },
    error: (error) => {
      this.saving = false;
      this.errorMessage =
        'The post was saved, but media upload failed. Open the post details and retry the upload. ' +
        this.getErrorMessage(error, '');
      this.closeForm();
      this.cdr.markForCheck();
      this.loadPosts();
    },
  });
}

private finishPostSave(message: string): void {
  this.saving = false;
  this.closeForm();
  this.successMessage = message;
  this.clearCreateFiles();
  this.currentPage = 1;
  this.loadPosts();
}

  openPostDetails(post: ChurchPost): void {
    this.selectedPost = null;
    this.showDetails = true;
    this.detailsLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.contentService.getPost(this.churchId, post.id).subscribe({
      next: (response) => {
        this.selectedPost = response.data;
        this.detailsLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.detailsLoading = false;
        this.errorMessage = this.getErrorMessage(
          error,
          'Unable to load post details.'
        );
        this.cdr.markForCheck();
      },
    });
  }

  closeDetails(): void {
    this.showDetails = false;
    this.selectedPost = null;
    this.selectedFiles = [];
  }

  changePostStatus(
    post: ChurchPost,
    action: 'publish' | 'unpublish' | 'archive'
  ): void {
    const actionLabel =
      action === 'unpublish' ? 'move back to draft' : action;

    if (
      !window.confirm(
        `Are you sure you want to ${actionLabel} "${post.title}"?`
      )
    ) {
      return;
    }

    this.errorMessage = '';

    this.contentService
      .updatePostStatus(this.churchId, post.id, action)
      .subscribe({
        next: (response) => {
          this.successMessage =
            response.message || `Post ${actionLabel} successfully.`;

          this.cdr.markForCheck();
          this.loadPosts();

          if (this.selectedPost?.id === post.id) {
            this.openPostDetails(post);
          }
        },
        error: (error) => {
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to update post status.'
          );
          this.cdr.markForCheck();
        },
      });
  }

  deletePost(post: ChurchPost): void {
    if (
      !window.confirm(
        `Permanently delete the post "${post.title}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    this.contentService.deletePost(this.churchId, post.id).subscribe({
      next: (response) => {
        this.successMessage =
          response.message || 'Post deleted successfully.';

        if (this.selectedPost?.id === post.id) {
          this.closeDetails();
        }

        this.cdr.markForCheck();
        this.loadPosts();
      },
      error: (error) => {
        this.errorMessage = this.getErrorMessage(
          error,
          'Unable to delete post.'
        );
        this.cdr.markForCheck();
      },
    });
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ];

    if (files.length > 10) {
      this.errorMessage = 'You can upload a maximum of 10 files at a time.';
      input.value = '';
      return;
    }

    if (files.some((file) => !allowedMimeTypes.includes(file.type))) {
      this.errorMessage = 'One or more files have an unsupported format.';
      input.value = '';
      return;
    }

    if (
      files.some(
        (file) => file.type.startsWith('image/') && file.size > 10 * 1024 * 1024
      )
    ) {
      this.errorMessage = 'Each image must be 10 MB or smaller.';
      input.value = '';
      return;
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    if (totalSize > 100 * 1024 * 1024) {
      this.errorMessage = 'The total upload size cannot exceed 100 MB.';
      input.value = '';
      return;
    }

    this.errorMessage = '';
    this.selectedFiles = files;
  }

  uploadMedia(): void {
    if (!this.selectedPost || this.selectedFiles.length === 0) {
      this.errorMessage = 'Select at least one media file.';
      return;
    }

    this.uploading = true;
    this.errorMessage = '';

    this.contentService
      .uploadMedia(
        this.churchId,
        this.selectedPost.id,
        this.selectedFiles
      )
      .subscribe({
        next: (response) => {
          this.uploading = false;
          this.selectedFiles = [];
          this.successMessage =
            response.message || 'Media uploaded successfully.';

          this.cdr.markForCheck();
          this.openPostDetails(this.selectedPost!);
        },
        error: (error) => {
          this.uploading = false;
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to upload media.'
          );
          this.cdr.markForCheck();
        },
      });
  }

  removeMedia(media: PostMedia): void {
    if (!this.selectedPost) return;

    if (
      !window.confirm(
        `Remove "${media.file_name}" from this post?`
      )
    ) {
      return;
    }

    this.contentService
      .deleteMedia(
        this.churchId,
        this.selectedPost.id,
        media.id
      )
      .subscribe({
        next: (response) => {
          this.successMessage =
            response.message || 'Media removed successfully.';
          this.cdr.markForCheck();
          this.openPostDetails(this.selectedPost!);
        },
        error: (error) => {
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to remove media.'
          );
          this.cdr.markForCheck();
        },
      });
  }

  formatPostType(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '—';

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
