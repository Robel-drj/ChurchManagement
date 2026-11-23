
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type ContributionStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'reversed';

export interface FinanceCategory {
  id: string;
  church_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export type AdjustmentType = 'refund' | 'reversal' | 'correction';

export type AdjustmentStatus = 'pending' | 'approved' | 'rejected';

export interface ContributionAdjustment {
  id: string;
  contribution_id: string;
  adjustment_type: AdjustmentType;
  amount: number;
  previous_amount: number | null;
  reason: string;
  status: AdjustmentStatus;
  created_at: string;
  approved_at: string | null;
  decided_at: string | null;
  member_name: string | null;
  created_by_name: string | null;
  decided_by_name: string | null;
  approved_by_name: string | null;
  contribution_status: string | null;
  current_contribution_amount: number | null;
}

export interface AdjustmentPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface AdjustmentListData {
  adjustments: ContributionAdjustment[];
  pagination: AdjustmentPagination;
}

export interface AdjustmentListResponse {
  success: boolean;
  message: string;
  data: AdjustmentListData;
}

export interface CreateAdjustmentRequest {
  contribution_id: string;
  adjustment_type: AdjustmentType;
  amount: number;
  reason: string;
}

export interface DecideAdjustmentRequest {
  decision: 'approved' | 'rejected';
}

export interface FinancePaymentMethod {
  id: string;
  church_id: string;
  method_name: string;
  provider: string | null;
  account_name: string | null;
  account_number: string | null;
  instructions: string | null;
  is_active: boolean;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string | null;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string | null;
  is_active?: boolean;
}

export interface FinanceReportTotals {
  total_contributions: number;
  confirmed_count: number;
  pending_count: number;
  rejected_count: number;
  reversed_count: number;
  confirmed_amount: number | string;
  pending_amount: number | string;
  rejected_amount: number | string;
  reversed_amount: number | string;
}

export interface FinanceReportCategory {
  category_id: string;
  category_name: string;
  contribution_count: number;
  confirmed_count: number;
  confirmed_amount: number | string;
  pending_amount: number | string;
}

export interface FinanceReportPaymentMethod {
  payment_method_id: string;
  method_name: string;
  contribution_count: number;
  confirmed_count: number;
  confirmed_amount: number | string;
  pending_amount: number | string;
}

export interface FinanceReportDailyActivity {
  contribution_day: string;
  contribution_count: number;
  confirmed_amount: number | string;
  pending_amount: number | string;
}

export interface FinanceReportData {
  period: {
    date_from: string | null;
    date_to: string | null;
  };
  totals: FinanceReportTotals;
  by_category: FinanceReportCategory[];
  by_payment_method: FinanceReportPaymentMethod[];
  daily_activity: FinanceReportDailyActivity[];
}

export interface FinanceReportResponse {
  success: boolean;
  message: string;
  data: FinanceReportData;
}

export interface Contribution {
  id: string;
  church_id: string;
  membership_id: string;
  category_id: string;
  payment_method_id: string;
  amount: number;
  payment_status: ContributionStatus;
  transaction_reference: string | null;
  contribution_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;

  member_name: string;
  member_phone: string;
  member_number: string | null;
  category_name: string;
  payment_method: string;
  received_by_name: string | null;
}

export interface ContributionDetails extends Contribution {
  member_email?: string | null;
  payment_provider?: string | null;
}

export interface FinancePagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ContributionListResponse {
  success: boolean;
  message: string;
  data: Contribution[];
  pagination: FinancePagination;
}

export interface ContributionDetailsResponse {
  success: boolean;
  message: string;
  data: ContributionDetails;
}

export interface FinanceListResponse<T> {
  success: boolean;
  message: string;
  data: T[];
}

export interface CreateContributionRequest {
  membership_id: string;
  category_id: string;
  payment_method_id: string;
  amount: number;
  payment_status?: 'pending' | 'confirmed';
  transaction_reference?: string | null;
  contribution_date?: string;
  notes?: string | null;
}

export interface UpdateContributionRequest {
  payment_status?: 'confirmed' | 'rejected';
  transaction_reference?: string | null;
  notes?: string | null;
}

export interface FinanceResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface CreatePaymentMethodRequest {
  method_name: string;
  provider?: string | null;
  account_name?: string | null;
  account_number?: string | null;
  instructions?: string | null;
}

export interface UpdatePaymentMethodRequest {
  method_name?: string;
  provider?: string | null;
  account_name?: string | null;
  account_number?: string | null;
  instructions?: string | null;
  is_active?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class FinanceService {
  private readonly apiUrl = 'http://localhost:3000/api/churches';

  getCategories(churchId: string): Observable<FinanceListResponse<FinanceCategory>> {
    return this.http.get<FinanceListResponse<FinanceCategory>>(
      `${this.apiUrl}/${churchId}/finance/categories`
    );
  }

getFinanceReport(
  churchId: string,
  dateFrom = '',
  dateTo = ''
): Observable<FinanceReportResponse> {
  let params = new HttpParams();

  if (dateFrom) {
    params = params.set('date_from', dateFrom);
  }

  if (dateTo) {
    params = params.set('date_to', dateTo);
  }

  return this.http.get<FinanceReportResponse>(
    `${this.apiUrl}/${churchId}/finance/reports`,
    { params }
  );
}

createPaymentMethod(
  churchId: string,
  data: CreatePaymentMethodRequest
): Observable<FinanceResponse<FinancePaymentMethod>> {
  return this.http.post<FinanceResponse<FinancePaymentMethod>>(
    `${this.apiUrl}/${churchId}/finance/payment-methods`,
    data
  );
}

getAdjustments(
  churchId: string,
  page = 1,
  limit = 20,
  status = '',
  adjustmentType = ''
): Observable<AdjustmentListResponse> {
  let params = new HttpParams()
    .set('page', page)
    .set('limit', limit);

  if (status) {
    params = params.set('status', status);
  }

  if (adjustmentType) {
    params = params.set('adjustment_type', adjustmentType);
  }

  return this.http.get<AdjustmentListResponse>(
    `${this.apiUrl}/${churchId}/finance/adjustments`,
    { params }
  );
}

createAdjustment(
  churchId: string,
  data: CreateAdjustmentRequest
): Observable<FinanceResponse<ContributionAdjustment>> {
  return this.http.post<FinanceResponse<ContributionAdjustment>>(
    `${this.apiUrl}/${churchId}/finance/adjustments`,
    data
  );
}

decideAdjustment(
  churchId: string,
  adjustmentId: string,
  data: DecideAdjustmentRequest
): Observable<FinanceResponse<ContributionAdjustment>> {
  return this.http.patch<FinanceResponse<ContributionAdjustment>>(
    `${this.apiUrl}/${churchId}/finance/adjustments/${adjustmentId}/decision`,
    data
  );
}

updatePaymentMethod(
  churchId: string,
  paymentMethodId: string,
  data: UpdatePaymentMethodRequest
): Observable<FinanceResponse<FinancePaymentMethod>> {
  return this.http.patch<FinanceResponse<FinancePaymentMethod>>(
    `${this.apiUrl}/${churchId}/finance/payment-methods/${paymentMethodId}`,
    data
  );
}

  getPaymentMethods(
    churchId: string
  ): Observable<FinanceListResponse<FinancePaymentMethod>> {
    return this.http.get<FinanceListResponse<FinancePaymentMethod>>(
      `${this.apiUrl}/${churchId}/finance/payment-methods`
    );
  }

createCategory(
  churchId: string,
  data: CreateCategoryRequest
): Observable<FinanceResponse<FinanceCategory>> {
  return this.http.post<FinanceResponse<FinanceCategory>>(
    `${this.apiUrl}/${churchId}/finance/categories`,
    data
  );
}

updateCategory(
  churchId: string,
  categoryId: string,
  data: UpdateCategoryRequest
): Observable<FinanceResponse<FinanceCategory>> {
  return this.http.patch<FinanceResponse<FinanceCategory>>(
    `${this.apiUrl}/${churchId}/finance/categories/${categoryId}`,
    data
  );
}

  getContributions(
    churchId: string,
    filters: {
      page?: number;
      limit?: number;
      search?: string;
      category_id?: string;
      payment_method_id?: string;
      payment_status?: string;
      date_from?: string;
      date_to?: string;
    }
  ): Observable<ContributionListResponse> {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<ContributionListResponse>(
      `${this.apiUrl}/${churchId}/finance/contributions`,
      { params }
    );
  }

  getContribution(
    churchId: string,
    contributionId: string
  ): Observable<ContributionDetailsResponse> {
    return this.http.get<ContributionDetailsResponse>(
      `${this.apiUrl}/${churchId}/finance/contributions/${contributionId}`
    );
  }

  createContribution(
    churchId: string,
    data: CreateContributionRequest
  ): Observable<FinanceResponse<Contribution>> {
    return this.http.post<FinanceResponse<Contribution>>(
      `${this.apiUrl}/${churchId}/finance/contributions`,
      data
    );
  }

  updateContribution(
    churchId: string,
    contributionId: string,
    data: UpdateContributionRequest
  ): Observable<FinanceResponse<Contribution>> {
    return this.http.patch<FinanceResponse<Contribution>>(
      `${this.apiUrl}/${churchId}/finance/contributions/${contributionId}`,
      data
    );
  }

  constructor(private http: HttpClient) {}
}
