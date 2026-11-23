
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChurchMedia {
  id: string;
  church_id: string;
  media_type: 'image' | 'video';
  media_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  cloudinary_public_id: string | null;
  created_at: string;
  source: 'post' | 'event';
  parent_id: string;
  parent_title: string | null;
  parent_status: string | null;
}

export interface MediaPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MediaListResponse {
  success: boolean;
  message: string;
  data: ChurchMedia[];
  pagination: MediaPagination;
}

@Injectable({
  providedIn: 'root'
})
export class ChurchMediaService {
  private readonly apiUrl = 'http://localhost:3000/api/churches';

  constructor(private http: HttpClient) {}

  getMedia(
    churchId: string,
    page = 1,
    limit = 20,
    source = 'all',
    mediaType = '',
    search = ''
  ): Observable<MediaListResponse> {

    let params = new HttpParams()
      .set('page', page)
      .set('limit', limit)
      .set('source', source);

    if (mediaType) {
      params = params.set('media_type', mediaType);
    }

    if (search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<MediaListResponse>(
      `${this.apiUrl}/${churchId}/media`,
      { params }
    );
  }
}
