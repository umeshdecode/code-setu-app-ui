import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { Shipment, ShipmentStatus } from 'src/app/models/shipment';
import { ShipmentService } from 'src/app/services/shipment.service';
import { DialogboxComponent } from '../../dialogbox/dialogbox.component';

@Component({
  selector: 'app-shipment-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatDialogModule],
  templateUrl: './shipment-list.component.html',
  styleUrls: ['./shipment-list.component.css']
})
export class ShipmentListComponent implements OnInit {
  shipments: Shipment[] = [];
  isLoading = false;
  loadError = '';

  // ── Pagination ────────────────────────────────────────────────────────
  pageSize = 10;
  currentPageNumber = 0;
  totalRecords = 0;
  totalPages = 0;

  constructor(
    private shipmentService: ShipmentService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadShipments();
  }

  loadShipments(pageNumber = this.currentPageNumber): void {
    this.isLoading = true;
    this.loadError = '';
    this.shipmentService.getShipments(pageNumber, this.pageSize).subscribe({
      next: response => {
        const list = this.extract(response);
        this.updatePagination(response, list.length);
        this.shipments = list;
        this.isLoading = false;
      },
      error: err => {
        console.error('Shipment load failed:', err);
        this.loadError = 'Unable to load shipments.';
        this.isLoading = false;
      }
    });
  }

  deleteShipment(shipment: Shipment): void {
    const ref = this.dialog.open(DialogboxComponent, {
      width: '420px',
      disableClose: true,
      data: {
        title: 'Delete Shipment',
        message: `Delete shipment #${shipment.shipmentId} (${shipment.sourceCity} → ${shipment.destinationCity})?`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed || !shipment.shipmentId) return;
      this.shipmentService.deleteShipment(shipment.shipmentId).subscribe({
        next: () => this.loadShipments(),
        error: err => { this.loadError = err.error?.message || 'Failed to delete shipment.'; }
      });
    });
  }

  // ── Pagination ────────────────────────────────────────────────────────
  goToPage(page: number): void {
    const total = this.getDisplayTotalPages();
    if (page < 0 || page >= total || page === this.currentPageNumber) return;
    this.currentPageNumber = page;
    this.loadShipments(page);
  }

  changePageSize(): void {
    this.currentPageNumber = 0;
    this.loadShipments(0);
  }

  get visiblePageNumbers(): number[] {
    const total = this.getDisplayTotalPages();
    const current = this.getDisplayCurrentPage();
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  getDisplayCurrentPage(): number { return this.currentPageNumber + 1; }
  getDisplayTotalPages(): number { return this.totalPages || (this.shipments.length > 0 ? 1 : 0); }
  getDisplayTotalRecords(): number { return this.totalRecords || this.shipments.length; }

  // ── Display helpers ───────────────────────────────────────────────────
  formatStatus(status: string | undefined | null): string {
    if (!status) return '';
    return status.split('_').join(' ');
  }

  getShipmentStatusClass(status: string | undefined | null): string {
    return 'shipment-status-' + (status || 'DRAFT').toLowerCase().split('_').join('-');
  }

  formatDate(dt: string | undefined | null): string {
    if (!dt) return '—';
    try {
      return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return dt; }
  }

  // ── Privates ──────────────────────────────────────────────────────────
  private extract(response: any): any[] {
    if (!response) return [];
    if (Array.isArray(response?.data?.content)) return response.data.content;
    if (Array.isArray(response?.dataList)) return response.dataList;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response)) return response;
    return [];
  }

  private updatePagination(response: any, loadedCount: number): void {
    const p = response?.data;
    this.totalRecords = p?.totalElements ?? loadedCount;
    this.currentPageNumber = p?.number ?? 0;
    this.totalPages = p?.totalPages ?? 1;
  }
}
