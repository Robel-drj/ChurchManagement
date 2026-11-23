
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type NotificationType =
  | 'general'
  | 'announcement'
  | 'event'
  | 'payment';

export type NotificationTarget = 'all' | 'selected';
export type NotificationStatus = 'sent' | 'cancelled';

export interface ChurchNotification {
  id: string;
  church_id: string;
  title: string;
  message: string;
  notification_type: NotificationType;
  target_type: NotificationTarget;
  status: NotificationStatus;
  recipient_count?: number;
  read_count?: number;
  unread_count?: number;
  created_at: string;
  sent_at?: string;
  cancelled_at?: string | null;
}

export interface NotificationPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface NotificationListResponse {
  success: boolean;
  message?: string;
  data: ChurchNotification[];
  pagination: NotificationPagination;
}

export interface NotificationDetailsResponse {
  success: boolean;
  message?: string;
  data: ChurchNotification;
}

export interface CreateNotificationRequest {
  title: string;
  message: string;
  notification_type: NotificationType;
  target_type: NotificationTarget;
  membership_ids?: string[];
}

export interface CreateNotificationResponse {
  success: boolean;
  message: string;
  data: ChurchNotification & {
    recipient_count: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private readonly apiUrl = 'http://localhost:3000/api/churches';

  constructor(private http: HttpClient) {}

  getNotifications(
    churchId: string,
    page = 1,
    limit = 10,
    status = ''
  ): Observable<NotificationListResponse> {

    let params = new HttpParams()
      .set('page', page)
      .set('limit', limit);

    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<NotificationListResponse>(
      `${this.apiUrl}/${churchId}/notifications`,
      { params }
    );
  }

  getNotification(
    churchId: string,
    notificationId: string
  ): Observable<NotificationDetailsResponse> {

    return this.http.get<NotificationDetailsResponse>(
      `${this.apiUrl}/${churchId}/notifications/${notificationId}`
    );
  }

  createNotification(
    churchId: string,
    data: CreateNotificationRequest
  ): Observable<CreateNotificationResponse> {

    return this.http.post<CreateNotificationResponse>(
      `${this.apiUrl}/${churchId}/notifications`,
      data
    );
  }

  cancelNotification(
    churchId: string,
    notificationId: string
  ): Observable<NotificationDetailsResponse> {

    return this.http.patch<NotificationDetailsResponse>(
      `${this.apiUrl}/${churchId}/notifications/${notificationId}/cancel`,
      {}
    );
  }
}
