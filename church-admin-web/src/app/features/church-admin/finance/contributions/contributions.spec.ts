import { TestBed } from '@angular/core/testing';
import { NEVER } from 'rxjs';

import { AuthService } from '../../../../core/service/auth.service';
import {
  ContributionDetails,
  CreateContributionRequest,
  FinanceService,
  UpdateContributionRequest,
} from '../../../../core/service/finance.service';
import { MemberService } from '../../../../core/service/member.service';
import { Contributions } from './contributions';

describe('Contributions', () => {
  const financeService = {
    createContribution: vi.fn(
      (_churchId: string, _data: CreateContributionRequest) => NEVER
    ),
    updateContribution: vi.fn(
      (
        _churchId: string,
        _contributionId: string,
        _data: UpdateContributionRequest
      ) => NEVER
    ),
  };

  let component: Contributions;

  beforeEach(async () => {
    financeService.createContribution.mockClear();
    financeService.updateContribution.mockClear();

    await TestBed.configureTestingModule({
      imports: [Contributions],
      providers: [
        { provide: AuthService, useValue: {} },
        { provide: FinanceService, useValue: financeService },
        { provide: MemberService, useValue: {} },
      ],
    }).compileComponents();

    component = TestBed.createComponent(Contributions).componentInstance;
    component.churchId = 'church-1';
  });

  it('sends payment_status when recording a contribution', () => {
    component.createData = {
      membership_id: 'membership-1',
      category_id: 'category-1',
      payment_method_id: 'method-1',
      amount: 125,
      payment_status: 'confirmed',
      transaction_reference: 'PAY-100',
      contribution_date: '',
      notes: '',
    };

    component.createContribution();

    expect(financeService.createContribution).toHaveBeenCalledWith(
      'church-1',
      expect.objectContaining({
        payment_status: 'confirmed',
      })
    );
    expect(
      financeService.createContribution.mock.calls[0][1]
    ).not.toHaveProperty('status');
  });

  it('sends a selected transition for a pending payment', () => {
    component.selectedContribution = contributionWithStatus('pending');
    component.editData = {
      payment_status: 'confirmed',
      transaction_reference: 'PAY-101',
      notes: 'Verified',
    };

    component.updateContribution();

    expect(financeService.updateContribution).toHaveBeenCalledWith(
      'church-1',
      'contribution-1',
      expect.objectContaining({ payment_status: 'confirmed' })
    );
  });

  it('does not resend the locked status when editing a confirmed payment', () => {
    component.selectedContribution = contributionWithStatus('confirmed');
    component.editData = {
      payment_status: '',
      transaction_reference: 'PAY-102',
      notes: 'Updated note',
    };

    component.updateContribution();

    expect(
      financeService.updateContribution.mock.calls[0][2]
    ).not.toHaveProperty('payment_status');
  });
});

function contributionWithStatus(
  paymentStatus: ContributionDetails['payment_status']
): ContributionDetails {
  return {
    id: 'contribution-1',
    church_id: 'church-1',
    membership_id: 'membership-1',
    category_id: 'category-1',
    payment_method_id: 'method-1',
    amount: 125,
    payment_status: paymentStatus,
    transaction_reference: null,
    contribution_date: '2026-11-20T00:00:00.000Z',
    notes: null,
    created_at: '2026-11-20T00:00:00.000Z',
    updated_at: '2026-11-20T00:00:00.000Z',
    member_name: 'Test Member',
    member_phone: '+1 555 0100',
    member_number: 'MEM-001',
    category_name: 'Offering',
    payment_method: 'Cash',
    received_by_name: 'Collector',
  };
}
