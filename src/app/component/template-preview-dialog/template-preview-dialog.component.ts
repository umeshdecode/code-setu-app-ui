import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-template-preview-dialog',
  template: `
    <div class="preview-dialog">
      <div class="dialog-header">
        <h2>Template Preview</h2>
        <button class="close-btn" (click)="close()">
          <i class="material-icons">close</i>
        </button>
      </div>
      <div class="dialog-content">
        <div class="html-container" [innerHTML]="safeHtml"></div>
      </div>
    </div>
  `,
  styles: [`
    .preview-dialog {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #f3f4f6;
    }
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      background: #fff;
      border-bottom: 1px solid #e5e7eb;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      z-index: 10;
    }
    .dialog-header h2 {
      margin: 0;
      font-size: 1.25rem;
      color: #1f2937;
    }
    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #6b7280;
    }
    .close-btn:hover {
      color: #111827;
    }
    .dialog-content {
      flex: 1;
      padding: 1.5rem;
      overflow-y: auto;
      display: flex;
      justify-content: center;
    }
    .html-container {
      background: #fff;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      width: 100%;
      max-width: 800px;
      padding: 2rem;
      min-height: 1056px; /* Approx A4 height */
    }
  `],
  encapsulation: ViewEncapsulation.None
})
export class TemplatePreviewDialogComponent {
  safeHtml: SafeHtml;

  constructor(
    public dialogRef: MatDialogRef<TemplatePreviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { html: string },
    private sanitizer: DomSanitizer
  ) {
    this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(data.html);
  }

  close(): void {
    this.dialogRef.close();
  }
}
