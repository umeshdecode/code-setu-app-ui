import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StaffuserServiceService } from './staffuser-service';

export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * The colour palette is fixed in styles.css and is no longer user-selectable —
 * a user chooses only how the app resolves light vs dark, and the font.
 */
export interface AppThemeSettings {
  mode: ThemeMode;
  fontFamily: string;
}

export const DEFAULT_THEME_SETTINGS: AppThemeSettings = {
  mode: 'system',
  fontFamily: 'Roboto, "Helvetica Neue", sans-serif'
};

const THEME_STORAGE_KEY = 'cargo_setu_theme_settings';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly settingsSubject = new BehaviorSubject<AppThemeSettings>(this.getStoredSettings());
  readonly settings$ = this.settingsSubject.asObservable();

  constructor(private readonly staffService: StaffuserServiceService) {}

  /**
   * Runs from APP_INITIALIZER, before any token exists, so it applies the locally
   * cached choice only. The server copy is pulled later by hydrateFromServer().
   */
  initialize(): void {
    this.applyTheme(this.settingsSubject.value);

    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', () => {
          if (this.settingsSubject.value.mode === 'system') {
            this.applyTheme(this.settingsSubject.value);
          }
        });
    }
  }

  get settings(): AppThemeSettings {
    return this.settingsSubject.value;
  }

  /**
   * Applies and caches immediately so the UI never waits on the network, then
   * persists to the backend so the choice follows the user to other devices.
   */
  updateTheme(partial: Partial<AppThemeSettings>): void {
    const nextSettings = {
      ...this.settingsSubject.value,
      ...partial
    };

    this.setLocal(nextSettings);

    this.staffService.updateMyPreferences(nextSettings).subscribe({
      error: (error) => console.warn('Unable to save theme preference to the server:', error)
    });
  }

  resetTheme(): void {
    this.updateTheme(DEFAULT_THEME_SETTINGS);
  }

  /**
   * Pulls the signed-in user's stored preference after login. The server copy wins,
   * so a second device adopts the choice made on the first. A failure here is silent:
   * the locally cached theme stays in effect rather than snapping back to defaults.
   */
  hydrateFromServer(): void {
    this.staffService.getMyPreferences().subscribe({
      next: (response: any) => {
        const stored = response?.data;
        if (!stored) {
          return;
        }
        this.setLocal({
          mode: this.isValidMode(stored.mode) ? stored.mode : this.settingsSubject.value.mode,
          fontFamily: stored.fontFamily || this.settingsSubject.value.fontFamily
        });
      },
      error: (error) => console.warn('Unable to load theme preference from the server:', error)
    });
  }

  /** Called on logout so the next user on this machine does not inherit the previous theme. */
  clearLocalTheme(): void {
    localStorage.removeItem(THEME_STORAGE_KEY);
    this.settingsSubject.next(DEFAULT_THEME_SETTINGS);
    this.applyTheme(DEFAULT_THEME_SETTINGS);
  }

  private setLocal(settings: AppThemeSettings): void {
    this.settingsSubject.next(settings);
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(settings));
    this.applyTheme(settings);
  }

  private isValidMode(mode: unknown): mode is ThemeMode {
    return mode === 'light' || mode === 'dark' || mode === 'system';
  }

  private getStoredSettings(): AppThemeSettings {
    try {
      const storedValue = localStorage.getItem(THEME_STORAGE_KEY);
      if (!storedValue) {
        return DEFAULT_THEME_SETTINGS;
      }

      // Reading field by field also discards the primary/secondary/accent keys
      // written by the previous free-colour version of this service.
      const parsed = JSON.parse(storedValue);
      return {
        mode: this.isValidMode(parsed?.mode) ? parsed.mode : DEFAULT_THEME_SETTINGS.mode,
        fontFamily: parsed?.fontFamily || DEFAULT_THEME_SETTINGS.fontFamily
      };
    } catch (error) {
      console.error('Unable to load saved theme settings:', error);
      return DEFAULT_THEME_SETTINGS;
    }
  }

  /**
   * Colours live entirely in styles.css (:root and .app-dark-theme). This only
   * flips which of those two token sets applies, plus the font — writing colour vars
   * onto :root here would shadow the stylesheet.
   */
  private applyTheme(settings: AppThemeSettings): void {
    const root = document.documentElement;
    const isDark = this.resolveMode(settings.mode) === 'dark';

    root.style.setProperty('--app-font-family', settings.fontFamily);
    root.style.setProperty('--mat-font-family', settings.fontFamily);
    root.style.setProperty('--mat-app-font-family', settings.fontFamily);
    root.style.setProperty('--mdc-typography-font-family', settings.fontFamily);

    // Mirrored onto <html> so the root element picks up the dark tokens too;
    // the body class is what the existing app-dark-theme rules key off.
    root.classList.toggle('app-dark-theme', isDark);
    document.body.classList.toggle('app-dark-theme', isDark);
    document.body.classList.toggle('app-light-theme', !isDark);
    document.body.style.fontFamily = settings.fontFamily;
  }

  private resolveMode(mode: ThemeMode): 'light' | 'dark' {
    if (mode !== 'system') {
      return mode;
    }

    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
