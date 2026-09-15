import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StaffuserServiceService } from './staffuser-service';

export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * The colour palette is fixed in styles.css and is no longer free-form —
 * a user chooses light/dark/system, the font, and which of these five vetted
 * "Web light blue" swatches acts as the app's accent colour.
 */
export interface AppThemeSettings {
  mode: ThemeMode;
  fontFamily: string;
  primaryColor: string;
}

export const PALETTE_SWATCHES: ReadonlyArray<{ label: string; hex: string }> = [
  { label: 'Primary', hex: '#4663ac' },
  { label: 'Surface tint', hex: '#e1f1fd' },
  { label: 'Muted', hex: '#d2deeb' },
  { label: 'Border', hex: '#c8d9ed' },
  { label: 'Border strong', hex: '#c1d8f0' }
];

export const DEFAULT_THEME_SETTINGS: AppThemeSettings = {
  mode: 'system',
  fontFamily: 'Roboto, "Helvetica Neue", sans-serif',
  primaryColor: PALETTE_SWATCHES[0].hex
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
          fontFamily: stored.fontFamily || this.settingsSubject.value.fontFamily,
          primaryColor: this.isValidPrimary(stored.primaryColor) ? stored.primaryColor : this.settingsSubject.value.primaryColor
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

  private isValidPrimary(hex: unknown): hex is string {
    return typeof hex === 'string' && PALETTE_SWATCHES.some((s) => s.hex.toLowerCase() === hex.toLowerCase());
  }

  private getStoredSettings(): AppThemeSettings {
    try {
      const storedValue = localStorage.getItem(THEME_STORAGE_KEY);
      if (!storedValue) {
        return DEFAULT_THEME_SETTINGS;
      }

      // Reading field by field also discards the secondary/accent keys written
      // by the previous free-colour version of this service.
      const parsed = JSON.parse(storedValue);
      return {
        mode: this.isValidMode(parsed?.mode) ? parsed.mode : DEFAULT_THEME_SETTINGS.mode,
        fontFamily: parsed?.fontFamily || DEFAULT_THEME_SETTINGS.fontFamily,
        primaryColor: this.isValidPrimary(parsed?.primaryColor) ? parsed.primaryColor : DEFAULT_THEME_SETTINGS.primaryColor
      };
    } catch (error) {
      console.error('Unable to load saved theme settings:', error);
      return DEFAULT_THEME_SETTINGS;
    }
  }

  /**
   * Surface tokens (bg/surface/border/text/status) stay entirely in styles.css.
   * This only flips which of the two blocks applies, sets the font, and derives
   * the accent + sidebar tokens from the chosen swatch — writing the fixed
   * surface colours here would shadow the stylesheet.
   */
  private applyTheme(settings: AppThemeSettings): void {
    const root = document.documentElement;
    const isDark = this.resolveMode(settings.mode) === 'dark';

    root.style.setProperty('--app-font-family', settings.fontFamily);
    root.style.setProperty('--mat-font-family', settings.fontFamily);
    root.style.setProperty('--mat-app-font-family', settings.fontFamily);
    root.style.setProperty('--mdc-typography-font-family', settings.fontFamily);

    this.applyPaletteTokens(settings.primaryColor, isDark);

    // Mirrored onto <html> so the root element picks up the dark tokens too;
    // the body class is what the existing app-dark-theme rules key off.
    root.classList.toggle('app-dark-theme', isDark);
    document.body.classList.toggle('app-dark-theme', isDark);
    document.body.classList.toggle('app-light-theme', !isDark);
    document.body.style.fontFamily = settings.fontFamily;
  }

  /**
   * Derives the accent (button/link) and sidebar tokens from the chosen swatch.
   * Four of the five palette swatches are near-white tints — one is literally
   * identical to the light-mode page background — so a raw 1:1 apply would make
   * buttons invisible. Both derivations darken/lighten just enough to stay
   * legible and distinct from their surface, while keeping the swatch's hue.
   */
  private applyPaletteTokens(primaryHex: string, isDark: boolean): void {
    const root = document.documentElement;

    // Brightness gap between the one strong swatch (~99) and the four pastels
    // (~211-238) is wide, so 130 safely separates them with margin either side.
    const accent = isDark
      ? (this.brightness(this.hexToRgb(primaryHex)) < 130
          ? this.lightenToBrightness(primaryHex, 150)
          : primaryHex)
      : this.darkenToBrightness(primaryHex, 140);

    const hover = isDark ? this.mixHex(accent, [255, 255, 255], 0.15) : this.mixHex(accent, [0, 0, 0], 0.15);

    root.style.setProperty('--app-primary', accent);
    root.style.setProperty('--app-primary-hover', hover);
    root.style.setProperty('--app-primary-contrast', this.contrastText(accent));
    root.style.setProperty('--app-primary-soft', this.hexToRgba(accent, isDark ? 0.18 : 0.12));
    root.style.setProperty('--app-primary-shadow', this.hexToRgba(accent, isDark ? 0.35 : 0.28));

    // The sidebar is a large filled panel whose markup hardcodes white text/icon
    // colours, so its fill must stay dark enough for that no matter which swatch
    // is picked — a much stricter brightness ceiling than the button accent above.
    const sidebarBg = this.darkenToBrightness(primaryHex, isDark ? 50 : 110);
    root.style.setProperty('--app-sidebar-bg', sidebarBg);
    root.style.setProperty('--app-sidebar-text', this.contrastText(sidebarBg));
  }

  private resolveMode(mode: ThemeMode): 'light' | 'dark' {
    if (mode !== 'system') {
      return mode;
    }

    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // ── Colour helpers ──────────────────────────────────────────────────────
  // Small, deterministic and scoped to the 5 known palette swatches — not a
  // general colour library, just enough to keep every swatch legible.

  private hexToRgb(hex: string): [number, number, number] {
    const normalized = hex.replace('#', '');
    const full = normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized;
    return [
      parseInt(full.substring(0, 2), 16),
      parseInt(full.substring(2, 4), 16),
      parseInt(full.substring(4, 6), 16)
    ];
  }

  private rgbToHex(r: number, g: number, b: number): string {
    const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
    return '#' + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('');
  }

  private brightness([r, g, b]: [number, number, number]): number {
    return (r * 299 + g * 587 + b * 114) / 1000;
  }

  private mixHex(hex: string, target: [number, number, number], t: number): string {
    const [r, g, b] = this.hexToRgb(hex);
    const clampT = Math.min(1, Math.max(0, t));
    return this.rgbToHex(
      r + (target[0] - r) * clampT,
      g + (target[1] - g) * clampT,
      b + (target[2] - b) * clampT
    );
  }

  /** Mixes toward black only when the source is brighter than the target — never lightens. */
  private darkenToBrightness(hex: string, targetBrightness: number): string {
    const src = this.brightness(this.hexToRgb(hex));
    if (src <= targetBrightness) {
      return hex;
    }
    return this.mixHex(hex, [0, 0, 0], 1 - targetBrightness / src);
  }

  /** Mixes toward white only when the source is darker than the target — never darkens. */
  private lightenToBrightness(hex: string, targetBrightness: number): string {
    const src = this.brightness(this.hexToRgb(hex));
    if (src >= targetBrightness) {
      return hex;
    }
    return this.mixHex(hex, [255, 255, 255], (targetBrightness - src) / (255 - src));
  }

  private hexToRgba(hex: string, alpha: number): string {
    const [r, g, b] = this.hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private contrastText(hex: string): string {
    return this.brightness(this.hexToRgb(hex)) > 150 ? '#16233d' : '#ffffff';
  }
}
