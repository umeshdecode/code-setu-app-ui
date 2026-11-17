import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatTabGroup } from '@angular/material/tabs';
import { ShiftingWorkspaceService } from 'src/app/services/shifting-workspace.service';
import { TemplateService } from 'src/app/services/template.service';

@Component({
  selector: 'app-shifting-workspace',
  templateUrl: './shifting-workspace.component.html',
  styleUrls: ['./shifting-workspace.component.css']
})
export class ShiftingWorkspaceComponent implements OnInit {
  @ViewChild('tabGroup') tabGroup!: MatTabGroup;

  customerId: string = '';
  shiftId: string = '';
  shift: any = null;
  isLoading = false;
  loadError = '';
  isQuickActionLoading = false;

  constructor(
    private route: ActivatedRoute,
    private workspaceService: ShiftingWorkspaceService,
    private templateService: TemplateService
  ) {}

  ngOnInit(): void {
    this.customerId = this.route.snapshot.paramMap.get('customerId') || '';
    this.shiftId = this.route.snapshot.paramMap.get('shiftId') || '';
    if (this.shiftId) {
      this.loadShift();
    }
  }

  loadShift(): void {
    this.isLoading = true;
    this.loadError = '';
    this.workspaceService.getShift(this.shiftId).subscribe({
      next: (response) => {
        this.shift = response?.data ?? response;
        this.isLoading = false;
      },
      error: () => {
        this.loadError = 'Unable to load shifting details.';
        this.isLoading = false;
      }
    });
  }

  goToTab(index: number): void {
    if (this.tabGroup) this.tabGroup.selectedIndex = index;
  }

  quickGenerateInvoice(): void {
    this.isQuickActionLoading = true;
    this.templateService.getInvoicePdf(this.shiftId).subscribe({
      next: (blob) => {
        this.templateService.deliverDocument(blob, `invoice-${this.shiftId}`)
          .catch((err) => console.error('Invoice display failed:', err))
          .finally(() => { this.isQuickActionLoading = false; });
      },
      error: () => { this.isQuickActionLoading = false; }
    });
  }

  quickPrintInventory(): void {
    this.isQuickActionLoading = true;
    this.templateService.getItemListPdf(this.shiftId).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, `inventory-${this.shiftId}.pdf`);
        this.isQuickActionLoading = false;
      },
      error: () => { this.isQuickActionLoading = false; }
    });
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  get progressStages(): { label: string; done: boolean }[] {
    const s = this.shift;
    const inv       = s?.inventoryCount > 0;
    const packed    = s?.packedCount > 0 && s?.packedCount >= s?.inventoryCount;
    const loaded    = s?.loadedCount  > 0 && s?.loadedCount  >= s?.inventoryCount;
    const tripOn    = ['IN_TRANSIT', 'DELIVERED'].includes(s?.tripStatus || s?.status || '');
    const delivered = (s?.tripStatus || s?.status) === 'DELIVERED';
    return [
      { label: 'Inventory', done: inv },
      { label: 'Packing',   done: packed },
      { label: 'Loading',   done: loaded },
      { label: 'Trip',      done: tripOn },
      { label: 'Delivery',  done: delivered },
    ];
  }

  get customerName(): string {
    // shift response only returns customerId; fall back to customerId from URL
    const s = this.shift;
    if (!s) return '—';
    return s.customerName
      || [s.customerFirstName, s.customerLastName].filter(Boolean).join(' ')
      || (s.customerId ? `Customer #${s.customerId}` : '—');
  }

  get shiftNumber(): string {
    return this.shift?.shiftingId || this.shift?.shiftNumber || this.shiftId;
  }

  get route_display(): string {
    const from = this.shift?.shiftFromCity || '—';
    const to = this.shift?.shiftToCity || '—';
    return `${from} → ${to}`;
  }

  get shiftStatus(): string {
    return this.shift?.status || this.shift?.shiftStatus || this.shift?.shiftingType || '—';
  }

  get moveDate(): string {
    const d = this.shift?.shiftingStartDate;
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
