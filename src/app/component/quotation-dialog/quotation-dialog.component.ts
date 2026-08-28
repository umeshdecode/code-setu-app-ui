import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TemplateService } from 'src/app/services/template.service';
import { CustomersService } from 'src/app/services/customers.service';
import { TemplatePreviewDialogComponent } from '../template-preview-dialog/template-preview-dialog.component';

@Component({
  selector: 'app-quotation-dialog',
  templateUrl: './quotation-dialog.component.html',
  styleUrls: ['./quotation-dialog.component.css']
})
export class QuotationDialogComponent implements OnInit {

  // Step control
  currentStep = 1; // 1 = template, 2 = shifting

  // Template state
  templates: any[] = [];
  templatePage = 0;
  templateTotalPages = 0;
  templateTotalElements = 0;
  selectedTemplate: any = null;
  isLoadingTemplates = false;
  isPreviewing = false;

  // Shifting state
  shiftings: any[] = [];
  shiftingPage = 0;
  shiftingTotalPages = 0;
  shiftingTotalElements = 0;
  selectedShifting: any = null;
  isLoadingShiftings = false;

  // Generation state
  isGenerating = false;
  isSending = false;
  errorMessage = '';

  public customerId: number;
  public customerName: string;

  constructor(
    public dialogRef: MatDialogRef<QuotationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private templateService: TemplateService,
    private customersService: CustomersService,
    private matDialog: MatDialog,
    private sanitizer: DomSanitizer
  ) {
    this.customerId = data.customerId;
    this.customerName = data.customerName || 'Customer';
  }

  ngOnInit(): void {
    this.loadTemplates();
  }

  previewTemplate(template: any, event: Event): void {
    event.stopPropagation();
    if (template.thumbnailHtmlStr) {
      this.matDialog.open(TemplatePreviewDialogComponent, {
        width: '900px',
        maxWidth: '95vw',
        maxHeight: '95vh',
        data: { html: template.thumbnailHtmlStr },
        panelClass: 'quotation-dialog-container'
      });
      return;
    }

    this.isPreviewing = true;
    this.templateService.getTemplateHtml(template.id).subscribe({
      next: (html: string) => {
        this.isPreviewing = false;
        template.thumbnailHtmlStr = html;
        template.thumbnailHtml = this.sanitizer.bypassSecurityTrustHtml(html);
        this.matDialog.open(TemplatePreviewDialogComponent, {
          width: '900px',
          maxWidth: '95vw',
          maxHeight: '95vh',
          data: { html },
          panelClass: 'quotation-dialog-container'
        });
      },
      error: (err: any) => {
        console.error('Failed to preview template:', err);
        this.errorMessage = 'Failed to load template preview.';
        this.isPreviewing = false;
      }
    });
  }

  // ── Template Step ──────────────────────────────────────────

  loadTemplates(page: number = 0): void {
    this.isLoadingTemplates = true;
    this.errorMessage = '';
    this.templatePage = page;
    this.templateService.getTemplatesByType('QUOTATION', page, 5).subscribe({
      next: (res: any) => {
        const pageData = res?.data;
        this.templates = pageData?.content || [];
        this.templateTotalPages = pageData?.totalPages || 0;
        this.templateTotalElements = pageData?.totalElements || 0;

        // Fetch thumbnails for each template
        this.templates.forEach(t => {
          this.templateService.getTemplateHtml(t.id).subscribe(html => {
            t.thumbnailHtmlStr = html;
            t.thumbnailHtml = this.sanitizer.bypassSecurityTrustHtml(html);
          });
        });

        // Auto-select favorite/default template
        if (!this.selectedTemplate) {
          const fav = this.templates.find((t: any) => t.favoriteTemplate === true);
          if (fav) this.selectedTemplate = fav;
        }
        this.isLoadingTemplates = false;
      },
      error: (err: any) => {
        console.error('Failed to load templates:', err);
        this.errorMessage = 'Failed to load templates.';
        this.isLoadingTemplates = false;
      }
    });
  }

  selectTemplate(template: any): void {
    this.selectedTemplate = template;
  }

  isTemplateSelected(template: any): boolean {
    return this.selectedTemplate?.id === template.id;
  }

  toggleDefaultTemplate(template: any, event: Event): void {
    event.stopPropagation();
    this.templateService.setDefaultTemplate(template.id).subscribe({
      next: () => {
        // Update local state
        this.templates.forEach((t: any) => t.favoriteTemplate = false);
        template.favoriteTemplate = true;
        this.selectedTemplate = template;
      },
      error: (err: any) => {
        console.error('Failed to set default template:', err);
      }
    });
  }

  goTemplatePage(page: number): void {
    if (page < 0 || page >= this.templateTotalPages) return;
    this.loadTemplates(page);
  }

  get templateVisiblePages(): number[] {
    const total = this.templateTotalPages;
    const current = this.templatePage + 1;
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  proceedToShiftings(): void {
    if (!this.selectedTemplate) return;
    this.currentStep = 2;
    this.loadShiftings();
  }

  // ── Shifting Step ──────────────────────────────────────────

  loadShiftings(page: number = 0): void {
    this.isLoadingShiftings = true;
    this.errorMessage = '';
    this.shiftingPage = page;
    this.customersService.getShiftingsByCustomer(this.customerId, page, 5).subscribe({
      next: (res: any) => {
        const pageData = res?.data;
        this.shiftings = pageData?.content || [];
        this.shiftingTotalPages = pageData?.totalPages || 0;
        this.shiftingTotalElements = pageData?.totalElements || 0;
        
        // Auto-select first shifting if only one
        if (this.shiftings.length === 1) {
          this.selectedShifting = this.shiftings[0];
        }
        
        this.isLoadingShiftings = false;
      },
      error: (err: any) => {
        console.error('Failed to load shiftings:', err);
        this.errorMessage = 'Failed to load customer shiftings.';
        this.isLoadingShiftings = false;
      }
    });
  }

  selectShifting(shifting: any): void {
    this.selectedShifting = shifting;
  }

  isShiftingSelected(shifting: any): boolean {
    return this.selectedShifting?.shiftingId === shifting.shiftingId;
  }

  goShiftingPage(page: number): void {
    if (page < 0 || page >= this.shiftingTotalPages) return;
    this.loadShiftings(page);
  }

  get shiftingVisiblePages(): number[] {
    const total = this.shiftingTotalPages;
    const current = this.shiftingPage + 1;
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  backToTemplates(): void {
    this.currentStep = 1;
  }

  // ── Generate ───────────────────────────────────────────────

  generateQuotation(): void {
    if (!this.selectedTemplate || !this.selectedShifting) return;
    this.isGenerating = true;
    this.errorMessage = '';

    this.templateService.getQuotationPdf(this.selectedShifting.shiftingId, this.selectedTemplate.id).subscribe({
      next: (blob: Blob) => {
        this.isGenerating = false;
        this.dialogRef.close({ blob, shiftingId: this.selectedShifting.shiftingId });
      },
      error: (err: any) => {
        console.error('PDF generation failed:', err);
        this.errorMessage = 'Failed to generate quotation PDF.';
        this.isGenerating = false;
      }
    });
  }

  generateAndSendQuotation(): void {
    if (!this.selectedTemplate || !this.selectedShifting) return;
    this.isSending = true;
    this.errorMessage = '';

    this.templateService.generateAndSendQuotation(this.selectedShifting.shiftingId, this.selectedTemplate.id).subscribe({
      next: (res: any) => {
        this.isSending = false;
        this.dialogRef.close({ action: 'sent', message: res.responseMessege || 'Quotation generated and sent successfully' });
      },
      error: (err: any) => {
        console.error('API call failed:', err);
        this.errorMessage = 'Failed to generate and send quotation.';
        this.isSending = false;
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
