import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-church-admin-placeholder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="placeholder-page">
      <div class="placeholder-card">
        <div class="placeholder-icon">✦</div>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
        <span>This section is ready for implementation.</span>
      </div>
    </div>
  `,
  styles: [`
    .placeholder-page {
      padding: 28px;
    }

    .placeholder-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 350px;
      padding: 30px;
      border: 1px solid #e8edf4;
      border-radius: 12px;
      background: white;
      text-align: center;
    }

    .placeholder-icon {
      display: grid;
      place-items: center;
      width: 55px;
      height: 55px;
      margin-bottom: 15px;
      border-radius: 14px;
      background: #edf2ff;
      color: #3158a6;
      font-size: 25px;
    }

    h1 {
      margin: 0 0 10px;
      color: #172033;
      font-size: 23px;
    }

    p {
      margin: 0 0 15px;
      color: #778196;
      font-size: 14px;
    }

    span {
      color: #3158a6;
      font-size: 12px;
      font-weight: 600;
    }
  `],
})
export class ChurchAdminPlaceholder implements OnInit {
  title = 'Church Management';
  description = 'Manage your church activities from this section.';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.title = data['title'] || 'Church Management';
      this.description =
        data['description'] || 'Manage your church activities from this section.';
    });
  }
}