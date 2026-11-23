import { Component, inject } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';

import { AuthService } from '../../../core/service/auth.service';

@Component({
  selector: 'app-platform-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './platform-admin-layout.html',
  styleUrl: './platform-admin-layout.scss',
})
export class PlatformAdminLayout {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly userName =
    this.authService.getCurrentUser()?.fullName ?? 'Administrator';

  logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }
}
