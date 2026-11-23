
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ------------------------------------
// MEMBER INTERFACES
// ------------------------------------

export interface ChurchMember {
  membership_id: string;
  member_number: string | null;
  membership_status: 'active' | 'pending' | 'suspended';
  joined_at: string;

  user_id: string;
  full_name: string;
  phone: string;
  email: string | null;

  gender: string | null;
  date_of_birth: string | null;
  address: string | null;
  emergency_contact: string | null;
  profile_image: string | null;

  roles: string[];
}

export interface MemberPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MemberListData {
  members: ChurchMember[];
  pagination: MemberPagination;
}

export interface MemberListResponse {
  success: boolean;
  message: string;
  data: MemberListData;
}

export interface MemberDetailsResponse {
  success: boolean;
  message: string;
  data: ChurchMember & {
    account_status?: string;
    profile_id?: string;
    membership_created_at?: string;
    profile_created_at?: string;
    profile_updated_at?: string;
  };
}

export interface RegisterMemberRequest {
  full_name: string;
  phone: string;
  email?: string | null;
  password: string;
  gender?: string | null;
  date_of_birth?: string | null;
  address?: string | null;
  emergency_contact?: string | null;
  profile_image?: string | null;
}

export interface UpdateMemberProfileRequest {
  gender?: string | null;
  date_of_birth?: string | null;
  address?: string | null;
  emergency_contact?: string | null;
  profile_image?: string | null;
}

export interface UpdateMemberStatusRequest {
  membership_status: 'active' | 'suspended';
}

export interface MemberResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ------------------------------------
// MEMBER SERVICE
// ------------------------------------

@Injectable({
  providedIn: 'root',
})
export class MemberService {

  private readonly apiUrl = 'http://localhost:3000/api/churches';

  constructor(private http: HttpClient) {}

  // GET ALL MEMBERS
  getMembers(
    churchId: string,
    page = 1,
    limit = 20,
    search = ''
  ): Observable<MemberListResponse> {

    let params = new HttpParams()
      .set('page', page)
      .set('limit', limit);

    if (search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<MemberListResponse>(
      `${this.apiUrl}/${churchId}/members`,
      { params }
    );
  }

  // GET MEMBER DETAILS
  getMemberDetails(
    churchId: string,
    membershipId: string
  ): Observable<MemberDetailsResponse> {

    return this.http.get<MemberDetailsResponse>(
      `${this.apiUrl}/${churchId}/members/${membershipId}`
    );
  }

  // REGISTER MEMBER
  registerMember(
    churchId: string,
    data: RegisterMemberRequest
  ): Observable<MemberResponse<any>> {

    return this.http.post<MemberResponse<any>>(
      `${this.apiUrl}/${churchId}/members`,
      data
    );
  }

  // UPDATE MEMBER PROFILE
  updateMemberProfile(
    churchId: string,
    membershipId: string,
    data: UpdateMemberProfileRequest
  ): Observable<MemberResponse<any>> {

    return this.http.patch<MemberResponse<any>>(
      `${this.apiUrl}/${churchId}/members/${membershipId}/profile`,
      data
    );
  }

  // UPDATE MEMBERSHIP STATUS
  updateMemberStatus(
    churchId: string,
    membershipId: string,
    data: UpdateMemberStatusRequest
  ): Observable<MemberResponse<any>> {

    return this.http.patch<MemberResponse<any>>(
      `${this.apiUrl}/${churchId}/members/${membershipId}/status`,
      data
    );
  }
}
