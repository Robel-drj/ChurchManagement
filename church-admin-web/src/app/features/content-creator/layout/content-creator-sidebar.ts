import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-content-creator-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './content-creator-sidebar.html',
  styleUrl: './content-creator-sidebar.scss',
})
export class ContentCreatorSidebar {}