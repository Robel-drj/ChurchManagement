import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-money-collector-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './money-collector-sidebar.html',
  styleUrl: './money-collector-sidebar.scss',
})
export class MoneyCollectorSidebar {}