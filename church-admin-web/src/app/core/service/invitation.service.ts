import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface InvitationDetails {
  church: {
    id: string;
    name: string;
  };
  invitedEmail: string | null;
  invitedPhone: string | null;
  expiresAt: string;
  accountExists: boolean;
}

export interface InvitationDetailsResponse {
  success: boolean;
  data: InvitationDetails;
}

export interface AcceptInvitationRequest {
  invitationToken: string;
  fullName?: string;
  email?: string;
  phone?: string;
  password: string;
}

export interface AcceptedInvitation {
  user: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string;
  };
  church: {
    id: string;
    name: string;
  };
  membershipId: string;
  role: 'church_admin';
  loginIdentifier: string;
}

export interface AcceptInvitationResponse {
  success: boolean;
  message: string;
  data: AcceptedInvitation;
}

@Injectable({
  providedIn: 'root',
})
export class InvitationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/invitations';

  getInvitation(token: string): Observable<InvitationDetailsResponse> {
    return this.http.get<InvitationDetailsResponse>(
      `${this.apiUrl}/${encodeURIComponent(token)}`
    );
  }

  acceptInvitation(
    data: AcceptInvitationRequest
  ): Observable<AcceptInvitationResponse> {
    return this.http.post<AcceptInvitationResponse>(
      `${this.apiUrl}/accept`,
      data
    );
  }
}
