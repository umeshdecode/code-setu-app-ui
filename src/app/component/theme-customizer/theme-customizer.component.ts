import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AppThemeSettings, ThemeService } from 'src/app/services/theme.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-theme-customizer',
  templateUrl: './theme-customizer.component.html',
  styleUrls: ['./theme-customizer.component.css']
})
export class ThemeCustomizerComponent implements OnInit, OnDestroy {
  settings!: AppThemeSettings;

  /** Read-only: the palette is fixed in styles.css and is not user-editable. */
  readonly paletteSwatches = [
    { label: 'Primary', hex: '#4663ac' },
    { label: 'Surface tint', hex: '#e1f1fd' },
    { label: 'Muted', hex: '#d2deeb' },
    { label: 'Border', hex: '#c8d9ed' },
    { label: 'Border strong', hex: '#c1d8f0' }
  ];

  readonly fontOptions = [
    { label: 'Roboto', value: 'Roboto, "Helvetica Neue", sans-serif' },
    { label: 'Arial', value: 'Arial, "Helvetica Neue", sans-serif' },
    { label: 'Segoe UI', value: '"Segoe UI", Arial, sans-serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' }
  ];

  private subscription?: Subscription;

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    this.subscription = this.themeService.settings$.subscribe((settings) => {
      this.settings = { ...settings };
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  updateTheme(): void {
    this.themeService.updateTheme(this.settings);
  }

  resetTheme(): void {
    this.themeService.resetTheme();
  }

  keepMenuOpen(event: Event): void {
    event.stopPropagation();
  }
}
