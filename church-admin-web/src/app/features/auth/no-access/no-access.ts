
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-no-access',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="no-access">
      <h1>No dashboard access</h1>
      <p>
        Your account does not currently have an active dashboard role.
        Please contact your church administrator.
      </p>
      <a routerLink="/login">Return to login</a>
    </main>
  `,
  styles: [`
    .no-access {
      min-height: 100vh;
      display: grid;
      place-content: center;
      text-align: center;
      padding: 24px;
      font-family: Arial, sans-serif;
    }

    p {
      color: #64748b;
      max-width: 480px;
      line-height: 1.6;
    }

    a {
      color: #1d4ed8;
    }
  `],
})
export class NoAccess {}
