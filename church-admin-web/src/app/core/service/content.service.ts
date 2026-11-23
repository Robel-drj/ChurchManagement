
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type PostType =
  | 'announcement'
  | 'news'
  | 'teaching'
  | 'notice'
  | 'other';

export type PostStatus = 'draft' | 'published' | 'archived';

export interface PostMedia {
  id: string;
  media_type: string;
  media_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  display_order: number;
}

export interface ChurchPost {
  id: string;
  church_id: string;
  title: string;
  content: string;
  post_type: PostType;
  status: PostStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  creator_name: string | null;
  media?: PostMedia[];
}

export interface PostPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PostListData {
  posts: ChurchPost[];
  pagination: PostPagination;
}

export interface PostListResponse {
  success: boolean;
  message: string;
  data: PostListData;
}

export interface PostResponse {
  success: boolean;
  message: string;
  data: ChurchPost;
}

export interface CreatePostRequest {
  title: string;
  content: string;
  post_type: PostType;
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  post_type?: PostType;
}

@Injectable({
  providedIn: 'root',
})
export class ContentService {
  private readonly apiUrl = 'http://localhost:3000/api/churches';

  constructor(private http: HttpClient) {}

  getPosts(
    churchId: string,
    page = 1,
    limit = 20,
    search = '',
    postType = '',
    status = ''
  ): Observable<PostListResponse> {
    let params = new HttpParams()
      .set('page', page)
      .set('limit', limit);

    if (search.trim()) params = params.set('search', search.trim());
    if (postType) params = params.set('post_type', postType);
    if (status) params = params.set('status', status);

    return this.http.get<PostListResponse>(
      `${this.apiUrl}/${churchId}/content/posts`,
      { params }
    );
  }

  getPost(
    churchId: string,
    postId: string
  ): Observable<PostResponse> {
    return this.http.get<PostResponse>(
      `${this.apiUrl}/${churchId}/content/posts/${postId}`
    );
  }

  createPost(
    churchId: string,
    data: CreatePostRequest
  ): Observable<PostResponse> {
    return this.http.post<PostResponse>(
      `${this.apiUrl}/${churchId}/content/posts`,
      data
    );
  }

  updatePost(
    churchId: string,
    postId: string,
    data: UpdatePostRequest
  ): Observable<PostResponse> {
    return this.http.patch<PostResponse>(
      `${this.apiUrl}/${churchId}/content/posts/${postId}`,
      data
    );
  }

  updatePostStatus(
    churchId: string,
    postId: string,
    action: 'publish' | 'unpublish' | 'archive'
  ): Observable<PostResponse> {
    return this.http.patch<PostResponse>(
      `${this.apiUrl}/${churchId}/content/posts/${postId}/status`,
      { action }
    );
  }

  uploadMedia(
    churchId: string,
    postId: string,
    files: File[]
  ): Observable<PostResponse> {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append('media', file);
    });

    return this.http.post<PostResponse>(
      `${this.apiUrl}/${churchId}/content/posts/${postId}/media`,
      formData
    );
  }

  deleteMedia(
    churchId: string,
    postId: string,
    mediaId: string
  ): Observable<PostResponse> {
    return this.http.delete<PostResponse>(
      `${this.apiUrl}/${churchId}/content/posts/${postId}/media/${mediaId}`
    );
  }

  deletePost(
    churchId: string,
    postId: string
  ): Observable<PostResponse> {
    return this.http.delete<PostResponse>(
      `${this.apiUrl}/${churchId}/content/posts/${postId}`
    );
  }
}
