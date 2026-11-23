
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChurchProfile {
  id: string;
  church_name: string;
  church_code: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  status: string;
  created_at: string;
}

export interface ChurchProfileResponse {
  success: boolean;
  message: string;
  data: ChurchProfile;
}

export interface UpdateChurchProfileRequest {
  church_name?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ChurchProfileService {
  private readonly apiUrl = 'http://localhost:3000/api/churches';

  constructor(private http: HttpClient) {}

  getProfile(churchId: string): Observable<ChurchProfileResponse> {
    return this.http.get<ChurchProfileResponse>(
      `${this.apiUrl}/${churchId}/profile`
    );
  }

  updateProfile(
    churchId: string,
    data: UpdateChurchProfileRequest
  ): Observable<ChurchProfileResponse> {
    return this.http.patch<ChurchProfileResponse>(
      `${this.apiUrl}/${churchId}/profile`,
      data
    );
  }

  uploadLogo(
    churchId: string,
    file: File
  ): Observable<ChurchProfileResponse> {
    const formData = new FormData();
    formData.append('logo', file);

    return this.http.post<ChurchProfileResponse>(
      `${this.apiUrl}/${churchId}/profile/logo`,
      formData
    );
  }
}
