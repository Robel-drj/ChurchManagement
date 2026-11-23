
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type AssignableStaffRole =
  | 'secretary'
  | 'money_collector'
  | 'content_creator';

export interface ChurchStaff {
  membership_id: string;
  member_number: string | null;
  membership_status: 'active' | 'pending' | 'suspended';
  joined_at: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  staff_roles: string[];
}

export interface StaffListResponse {
  success: boolean;
  message: string;
  data: ChurchStaff[];
}

export interface StaffRoleResponse {
  success: boolean;
  message: string;
  data: {
    membership_id: string;
    role_name: AssignableStaffRole;
    assigned?: boolean;
    removed?: boolean;
    message?: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class StaffService {
  private readonly apiUrl = 'http://localhost:3000/api/churches';

  constructor(private http: HttpClient) {}

  getStaff(churchId: string): Observable<StaffListResponse> {
    return this.http.get<StaffListResponse>(
      `${this.apiUrl}/${churchId}/staff`
    );
  }

  assignRole(
    churchId: string,
    membershipId: string,
    roleName: AssignableStaffRole
  ): Observable<StaffRoleResponse> {
    return this.http.post<StaffRoleResponse>(
      `${this.apiUrl}/${churchId}/staff/${membershipId}/roles`,
      { role_name: roleName }
    );
  }

  removeRole(
    churchId: string,
    membershipId: string,
    roleName: AssignableStaffRole
  ): Observable<StaffRoleResponse> {
    return this.http.delete<StaffRoleResponse>(
      `${this.apiUrl}/${churchId}/staff/${membershipId}/roles`,
      { body: { role_name: roleName } }
    );
  }
}
