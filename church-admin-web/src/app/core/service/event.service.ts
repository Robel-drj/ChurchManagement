
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type EventStatus =
  | 'draft'
  | 'published'
  | 'cancelled'
  | 'completed';

export interface EventMedia {
  id: string;
  media_type: 'image' | 'video';
  media_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  display_order?: number;
}

export interface ChurchEvent {
  id: string;
  church_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_date: string;
  end_date: string | null;
  status: EventStatus;
  created_at: string;
  updated_at: string;
  creator_name?: string | null;
  media?: EventMedia[];
}

export interface EventPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface EventListResponse {
  success: boolean;
  message?: string;
  data: ChurchEvent[];
  pagination?: EventPagination;
}

export interface EventResponse {
  success: boolean;
  message?: string;
  data: ChurchEvent;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  location?: string;
  start_date: string;
  end_date?: string;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  location?: string;
  start_date?: string;
  end_date?: string | null;
}

export type EventAction =
  | 'publish'
  | 'unpublish'
  | 'cancel'
  | 'complete';

@Injectable({
  providedIn: 'root'
})
export class EventService {

  private readonly apiUrl = 'http://localhost:3000/api/churches';

  constructor(private http: HttpClient) {}

  getEvents(
    churchId: string,
    page = 1,
    limit = 20,
    search = '',
    status = ''
  ): Observable<EventListResponse> {

    let params = new HttpParams()
      .set('page', page)
      .set('limit', limit);

    if (search.trim()) {
      params = params.set('search', search.trim());
    }

    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<EventListResponse>(
      `${this.apiUrl}/${churchId}/events`,
      { params }
    );
  }

  getEvent(
    churchId: string,
    eventId: string
  ): Observable<EventResponse> {
    return this.http.get<EventResponse>(
      `${this.apiUrl}/${churchId}/events/${eventId}`
    );
  }

  createEvent(
    churchId: string,
    data: CreateEventRequest
  ): Observable<EventResponse> {
    return this.http.post<EventResponse>(
      `${this.apiUrl}/${churchId}/events`,
      data
    );
  }

  updateEvent(
    churchId: string,
    eventId: string,
    data: UpdateEventRequest
  ): Observable<EventResponse> {
    return this.http.patch<EventResponse>(
      `${this.apiUrl}/${churchId}/events/${eventId}`,
      data
    );
  }

  updateEventStatus(
    churchId: string,
    eventId: string,
    action: EventAction
  ): Observable<EventResponse> {
    return this.http.patch<EventResponse>(
      `${this.apiUrl}/${churchId}/events/${eventId}/status`,
      { action }
    );
  }

  uploadEventMedia(
    churchId: string,
    eventId: string,
    files: File[]
  ): Observable<EventResponse> {
    const formData = new FormData();

    files.forEach(file => {
      formData.append('media', file);
    });

    return this.http.post<EventResponse>(
      `${this.apiUrl}/${churchId}/events/${eventId}/media`,
      formData
    );
  }

  deleteEventMedia(
    churchId: string,
    eventId: string,
    mediaId: string
  ): Observable<EventResponse> {
    return this.http.delete<EventResponse>(
      `${this.apiUrl}/${churchId}/events/${eventId}/media/${mediaId}`
    );
  }

  deleteEvent(
    churchId: string,
    eventId: string
  ): Observable<EventResponse> {
    return this.http.delete<EventResponse>(
      `${this.apiUrl}/${churchId}/events/${eventId}`
    );
  }
}
