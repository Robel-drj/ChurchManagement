import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChurchDashboardData {
  church: {
    id: string;
    church_name: string;
    church_code: string;
    status: string;
    created_at: string;
  };

  memberships: {
    total_members: number;
    active_members: number;
    pending_members: number;
    suspended_members: number;
  };

  staff: {
    role_name: string;
    member_count: number;
  }[];

  recentRegistrations: {
    registration_date: string;
    registrations: number;
  }[];
}

export interface ChurchDashboardResponse {
  success: boolean;
  message: string;
  data: ChurchDashboardData;
}

@Injectable({
  providedIn: 'root',
})
export class ChurchService {
  private readonly apiUrl = 'http://localhost:3000/api/churches';

  constructor(private http: HttpClient) {}

  getDashboard(churchId: string): Observable<ChurchDashboardResponse> {
    return this.http.get<ChurchDashboardResponse>(
      `${this.apiUrl}/${churchId}/dashboard`
    );
  }
}