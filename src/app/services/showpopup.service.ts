import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

export type PopupType = 'success' | 'error' | 'warning' | 'info' | 'permission';

const DEFAULT_PERMISSION_DENIED_MESSAGE = "You don't have permission to perform this action.";

/**
 * Single source of every user-facing success/error/warning/permission-denied
 * popup in the app — every screen should go through this service (or
 * showApiError/showResponsePopup) rather than calling MatSnackBar or
 * window.alert directly, so the visual treatment stays consistent.
 */
@Injectable({
  providedIn: 'root'
})
export class ShowpopupService {

  constructor(private snackBar: MatSnackBar) { }

  private display(message: string, type: PopupType) {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [`pop-${type}`] // This applies the CSS class
    });
  }

  private getThemeByCode(code: number): PopupType {
    const codeStr = code?.toString() || '';

    if (codeStr === '200' || codeStr === '201') {
      return 'success';                                   // Green
    } else if (codeStr === '401' || codeStr === '403') {
      return 'permission';                                 // Amber/lock — auth or access issue
    } else if (['409', '422', '429'].includes(codeStr)) {
      return 'warning';                                    // Amber — user-fixable (conflict/validation)
    } else if (['400', '404', '500', '502', '503'].includes(codeStr)) {
      return 'error';                                       // Red
    } else {
      return 'info';                                        // Blue
    }
  }

  showResponsePopup(message: any, code: number) {
    const theme = this.getThemeByCode(code);
    const displayMessage = message?.toString() || "No message provided";
    this.display(displayMessage, theme);
  }

  // Extract the most relevant message from an HTTP error and show it as the
  // matching alert type — 401/403 read as permission-denied, not a flat error.
  showApiError(err: any, fallback?: string) {
    const message = this.extractApiError(err, fallback);
    const status = err?.status ?? err?.error?.responseCode;
    if (status === 401 || status === 403) {
      this.showPermissionDenied(message);
    } else {
      this.showError(message);
    }
  }

  extractApiError(err: any, fallback?: string): string {
    const msg =
      err?.error?.responseMessage ||
      err?.error?.responseMessege ||
      err?.error?.message ||
      err?.message ||
      fallback ||
      'Something went wrong';
    return msg?.toString() || 'Something went wrong';
  }

  // Helper methods for direct use
  showSuccess(message: string) {
    this.display(message, 'success');
  }

  showError(message: string) {
    this.display(message, 'error');
  }

  showWarning(message: string) {
    this.display(message, 'warning');
  }

  showInfo(message: string) {
    this.display(message, 'info');
  }

  /** A user attempted something their role/permissions don't allow. */
  showPermissionDenied(message?: string) {
    this.display(message?.toString() || DEFAULT_PERMISSION_DENIED_MESSAGE, 'permission');
  }
}