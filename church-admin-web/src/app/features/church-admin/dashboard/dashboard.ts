import { CommonModule } from '@angular/common';
import { ChangeDetectorRef,Component, OnInit,inject } from '@angular/core';
import { ChurchService, ChurchDashboardData } from '../../../core/service/church.service';
import { AuthService } from '../../../core/service/auth.service';

@Component({
  selector: 'app-church-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
    private readonly cdr = inject(ChangeDetectorRef);
  dashboard: ChurchDashboardData | null = null;

  loading = true;
  errorMessage = '';

  constructor(
    private churchService: ChurchService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
     this.cdr.markForCheck();
  }

  loadDashboard(): void {
    const membership = this.authService.getActiveMembership();

    if (!membership?.churchId) {
      this.errorMessage = 'No active church membership was selected.';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.errorMessage = '';
 this.cdr.markForCheck();
    this.churchService.getDashboard(membership.churchId).subscribe({
      next: (response) => {
        this.dashboard = response.data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.message || 'Unable to load the church dashboard.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  get registrationMaximum(): number {
    if (!this.dashboard?.recentRegistrations.length) return 1;

    return Math.max(
      1,
      ...this.dashboard.recentRegistrations.map(
        (item) => item.registrations
      )
    );
  }

  getRegistrationHeight(count: number): number {
    return Math.max(5, (count / this.registrationMaximum) * 100);
  }
}