
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type ChurchStatus = 'pending' | 'active' | 'suspended';

export interface PlatformChurch {
  id: string;
  church_name: string;
  church_code: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  status: ChurchStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardSummary {
  totalChurches: number;
  activeChurches: number;
  pendingChurches: number;
  suspendedChurches: number;
}

export interface ChurchListResponse {
  success: boolean;
  data: PlatformChurch[];
  pagination: {
    limit: number;
    offset: number;
    returned: number;
  };
}
export interface PlatformAuditLog {
  id: string;
  church_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  performed_by: string | null;
  church_name: string | null;
}

export interface AuditLogsResponse {
  success: boolean;
  data: PlatformAuditLog[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    returned: number;
  };
}
export interface ChurchResponse {
  success: boolean;
  message?: string;
  data: PlatformChurch | {
    church: PlatformChurch;
    rolesCreated: string[];
    permissionsCreated: number;
  };
}

export interface SummaryResponse {
  success: boolean;
  data: DashboardSummary;
}

export interface ChurchInvitation {
  id: string;
  church_id: string;
  church_name: string;
  invited_email: string | null;
  invited_phone: string | null;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  invited_by_name: string | null;
  role_name: string | null;
}

export interface InvitationResponse {
  success: boolean;
  message?: string;
  data: {
    churchName?: string;
    invitation: ChurchInvitation;
    invitationToken?: string;
  };
}

export interface InvitationListResponse {
  success: boolean;
  data: ChurchInvitation[];
}


@Injectable({
  providedIn: 'root',
})
export class PlatformService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/platform';

  getDashboardSummary(): Observable<SummaryResponse> {
    return this.http.get<SummaryResponse>(
      `${this.apiUrl}/dashboard-summary`
    );
  }

getInvitations(churchId: string): Observable<InvitationListResponse> {
  return this.http.get<InvitationListResponse>(
    `${this.apiUrl}/churches/${churchId}/invitations`
  );
}

createInvitation(
  churchId: string,
  data: {
    invitedEmail?: string;
    invitedPhone?: string;
  }
): Observable<InvitationResponse> {
  return this.http.post<InvitationResponse>(
    `${this.apiUrl}/churches/${churchId}/invitations`,
    data
  );
}

revokeInvitation(
  churchId: string,
  invitationId: string
): Observable<InvitationResponse> {
  return this.http.post<InvitationResponse>(
    `${this.apiUrl}/churches/${churchId}/invitations/${invitationId}/revoke`,
    {}
  );
}

regenerateInvitation(
  churchId: string,
  invitationId: string
): Observable<InvitationResponse> {
  return this.http.post<InvitationResponse>(
    `${this.apiUrl}/churches/${churchId}/invitations/${invitationId}/regenerate`,
    {}
  );
}

  getChurches(
    status?: ChurchStatus | '',
    search = '',
    limit = 20,
    offset = 0
  ): Observable<ChurchListResponse> {
    let params = new HttpParams()
      .set('limit', limit)
      .set('offset', offset);

    if (status) {
      params = params.set('status', status);
    }

    if (search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<ChurchListResponse>(
      `${this.apiUrl}/churches`,
      { params }
    );
  }

  getChurch(churchId: string): Observable<ChurchResponse> {
    return this.http.get<ChurchResponse>(
      `${this.apiUrl}/churches/${churchId}`
    );
  }

  registerChurch(data: {
    churchName: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
  }): Observable<ChurchResponse> {
    return this.http.post<ChurchResponse>(
      `${this.apiUrl}/churches`,
      data
    );
  }

  updateChurch(
    churchId: string,
    data: Partial<{
      churchName: string;
      address: string;
      phone: string;
      email: string;
      logoUrl: string;
    }>
  ): Observable<ChurchResponse> {
    return this.http.patch<ChurchResponse>(
      `${this.apiUrl}/churches/${churchId}`,
      data
    );
  }

  changeChurchStatus(
    churchId: string,
    status: 'active' | 'suspended'
  ): Observable<ChurchResponse> {
    return this.http.patch<ChurchResponse>(
      `${this.apiUrl}/churches/${churchId}/status`,
      { status }
    );
  }
  getAuditLogs(
  limit = 20,
  offset = 0,
  search = '',
  action = ''
) {
  let params = new HttpParams()
    .set('limit', limit)
    .set('offset', offset);

  if (search.trim()) {
    params = params.set('search', search.trim());
  }

  if (action) {
    params = params.set('action', action);
  }

  return this.http.get<AuditLogsResponse>(
    `${this.apiUrl}/audit-logs`,
    { params }
  );
}
}
