import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  Trip, TripStatus, TripExpense, TripDocument, AddExpensePayload
} from 'src/app/models/trip';
import { TripService } from 'src/app/services/trip.service';
import { DriverService } from 'src/app/services/driver.service';
import { VehicleService } from 'src/app/services/vehicle.service';
import { CustomersService } from 'src/app/services/customers.service';
import { DialogboxComponent } from '../dialogbox/dialogbox.component';

export const TRIP_STATUS_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  CREATED:              ['DRIVER_ASSIGNED', 'CANCELLED'],
  DRIVER_ASSIGNED:      ['VEHICLE_ASSIGNED', 'CANCELLED'],
  VEHICLE_ASSIGNED:     ['READY_FOR_DISPATCH', 'CANCELLED'],
  READY_FOR_DISPATCH:   ['STARTED', 'ON_HOLD', 'CANCELLED'],
  STARTED:              ['REACHED_PICKUP', 'ON_HOLD', 'BREAKDOWN', 'DELAYED', 'CANCELLED'],
  REACHED_PICKUP:       ['LOADING', 'ON_HOLD', 'BREAKDOWN'],
  LOADING:              ['IN_TRANSIT', 'ON_HOLD'],
  IN_TRANSIT:           ['REACHED_DESTINATION', 'ON_HOLD', 'BREAKDOWN', 'DELAYED'],
  REACHED_DESTINATION:  ['UNLOADING'],
  UNLOADING:            ['COMPLETED'],
  COMPLETED:            ['CLOSED'],
  CLOSED:               [],
  CANCELLED:            [],
  ON_HOLD:              [],
  BREAKDOWN:            [],
  DELAYED:              [],
};

export const TRIP_MAIN_SEQUENCE: TripStatus[] = [
  'CREATED', 'DRIVER_ASSIGNED', 'VEHICLE_ASSIGNED', 'READY_FOR_DISPATCH',
  'STARTED', 'REACHED_PICKUP', 'LOADING', 'IN_TRANSIT',
  'REACHED_DESTINATION', 'UNLOADING', 'COMPLETED', 'CLOSED',
];

const INTERRUPTION_STATUSES: TripStatus[] = ['ON_HOLD', 'BREAKDOWN', 'DELAYED'];

@Component({
  selector: 'app-trip',
  templateUrl: './trip.component.html',
  styleUrls: ['./trip.component.css']
})
export class TripComponent implements OnInit {

  // ── List ─────────────────────────────────────────────────────────────
  trips: Trip[] = [];
  isLoading = false;
  loadError = '';

  // ── Panel toggles ─────────────────────────────────────────────────────
  showCreateForm = false;
  showDetailPanel = false;
  selectedTrip: Trip | null = null;

  // ── Dropdown data ─────────────────────────────────────────────────────
  driverList: any[] = [];
  vehicleList: any[] = [];
  customerList: any[] = [];
  driverLoadError = '';
  vehicleLoadError = '';
  customerLoadError = '';

  // ── Pagination ────────────────────────────────────────────────────────
  pageSize = 10;
  currentPageNumber = 0;
  totalRecords = 0;
  totalPages = 0;

  // ── Create form ───────────────────────────────────────────────────────
  createStep = 0;
  createSteps = ['Trip Info', 'Assign Driver & Vehicle', 'Review'];
  isCreating = false;
  createMessage = '';
  createError = '';
  newTrip: any = this.emptyTripForm();

  createSnackbar = { message: '', error: false, visible: false };
  private createSnackbarTimer: any;

  // ── Detail panel ──────────────────────────────────────────────────────
  isLoadingDetail = false;
  detailError = '';

  // Status transition
  transitionTarget: TripStatus | null = null;
  transitionRemarks = '';
  isTransitioning = false;
  transitionError = '';

  // Expenses
  expenses: TripExpense[] = [];
  isLoadingExpenses = false;
  expenseError = '';
  expenseMessage = '';
  newExpense: any = this.emptyExpenseForm();
  isAddingExpense = false;

  // History
  statusHistory: any[] = [];
  isLoadingHistory = false;

  // Documents
  documents: TripDocument[] = [];
  isLoadingDocuments = false;
  documentError = '';
  documentMessage = '';
  isUploadingDocument = false;
  newDocument: any = { documentType: '', fileName: '' };
  private selectedDocFile: File | null = null;

  readonly expenseTypes: string[] = ['FUEL', 'TOLL', 'PARKING', 'FOOD', 'LABOUR', 'REPAIR', 'POLICE_FINE', 'OTHER'];
  readonly documentTypes: string[] = ['POD', 'BOL', 'INVOICE', 'PERMIT', 'INSURANCE', 'CHALLAN', 'E_WAY_BILL', 'OTHER'];
  readonly mainSequence = TRIP_MAIN_SEQUENCE;

  constructor(
    private tripService: TripService,
    private driverService: DriverService,
    private vehicleService: VehicleService,
    private customersService: CustomersService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadTrips();
    this.loadDrivers();
    this.loadVehicles();
    this.loadCustomers();
  }

  // ── Load list ─────────────────────────────────────────────────────────
  loadTrips(pageNumber = this.currentPageNumber): void {
    this.isLoading = true;
    this.loadError = '';
    this.tripService.getTrips(pageNumber, this.pageSize).subscribe({
      next: response => {
        const list = this.extract(response);
        this.updatePagination(response, list.length);
        this.trips = list;
        this.isLoading = false;
      },
      error: err => {
        console.error('Trip load failed:', err);
        this.loadError = 'Unable to load trips.';
        this.isLoading = false;
      }
    });
  }

  // ── Dropdowns ─────────────────────────────────────────────────────────
  loadDrivers(): void {
    this.driverService.getDrivers().subscribe({
      next: res => { this.driverList = this.extract(res); },
      error: () => { this.driverLoadError = 'Unable to load drivers.'; }
    });
  }

  loadVehicles(): void {
    this.vehicleService.getVehicles().subscribe({
      next: res => {
        const all = this.extract(res);
        this.vehicleList = all.filter((v: any) =>
          !v.status || String(v.status).toUpperCase() === 'AVAILABLE'
        );
      },
      error: () => { this.vehicleLoadError = 'Unable to load vehicles.'; }
    });
  }

  loadCustomers(): void {
    this.customersService.getCustomers(0, 100).subscribe({
      next: res => { this.customerList = this.extract(res); },
      error: () => { this.customerLoadError = 'Unable to load customers.'; }
    });
  }

  // ── Create form ───────────────────────────────────────────────────────
  openCreateForm(): void {
    this.showCreateForm = true;
    this.showDetailPanel = false;
    this.selectedTrip = null;
    this.createStep = 0;
    this.createMessage = '';
    this.createError = '';
    this.newTrip = this.emptyTripForm();
  }

  closeCreateForm(): void {
    this.showCreateForm = false;
  }

  resetCreateForm(): void {
    this.newTrip = this.emptyTripForm();
    this.createStep = 0;
    this.createMessage = '';
    this.createError = '';
  }

  get isFirstCreateStep(): boolean { return this.createStep === 0; }
  get isLastCreateStep(): boolean  { return this.createStep === this.createSteps.length - 1; }

  nextCreateStep(): void {
    if (!this.validateCreateStep()) return;
    if (!this.isLastCreateStep) this.createStep++;
  }

  prevCreateStep(): void {
    if (!this.isFirstCreateStep) this.createStep--;
  }

  validateCreateStep(): boolean {
    if (this.createStep === 0) {
      if (!this.newTrip.shiftingId) { this.showCreateSnackbar('Please select a shifting', true); return false; }
    }
    return true;
  }

  onCustomerChange(): void {
    const customer = this.customerList.find((c: any) =>
      c.customerId === this.newTrip.customerId || c.id === this.newTrip.customerId
    );
    if (!customer) return;
    this.newTrip.customerShiftings = customer.shiftings || [];
    this.newTrip.shiftingId = null;
    if (this.newTrip.customerShiftings.length === 1) {
      this.newTrip.shiftingId = this.newTrip.customerShiftings[0].shiftingId
        || this.newTrip.customerShiftings[0].id;
      this.onShiftingChange();
    }
  }

  onShiftingChange(): void {
    const shifting = (this.newTrip.customerShiftings || []).find((s: any) =>
      s.shiftingId === this.newTrip.shiftingId || s.id === this.newTrip.shiftingId
    );
    if (shifting) {
      this.newTrip.sourceCity      = shifting.shiftFromCity || '';
      this.newTrip.destinationCity = shifting.shiftToCity   || '';
    }
  }

  createTrip(): void {
    this.isCreating = true;
    this.createError = '';
    this.createMessage = '';

    const payload: any = {
      shiftingId:        this.newTrip.shiftingId        || undefined,
      driverId:          this.newTrip.driverId           || undefined,
      vehicleId:         this.newTrip.vehicleId          || undefined,
      plannedStartTime:  this.newTrip.plannedStartTime   || undefined,
      plannedEndTime:    this.newTrip.plannedEndTime      || undefined,
      plannedDistanceKm: this.newTrip.plannedDistanceKm  || undefined,
      remarks:           this.newTrip.remarks             || '',
      status:            'CREATED',
      active:            true,
    };

    this.tripService.createTrip(payload).subscribe({
      next: () => {
        this.isCreating = false;
        this.showCreateSnackbar('Trip created successfully.');
        this.resetCreateForm();
        this.showCreateForm = false;
        this.loadTrips();
      },
      error: err => {
        console.error('Create trip failed:', err);
        this.isCreating = false;
        this.createError = err.error?.responseMessege || err.error?.message || 'Unable to create trip.';
      }
    });
  }

  showCreateSnackbar(message: string, error = false): void {
    clearTimeout(this.createSnackbarTimer);
    this.createSnackbar = { message, error, visible: true };
    this.createSnackbarTimer = setTimeout(() => this.createSnackbar.visible = false, 3500);
  }

  // ── Detail panel ──────────────────────────────────────────────────────
  openDetailPanel(trip: Trip): void {
    this.showCreateForm = false;
    this.showDetailPanel = true;
    this.selectedTrip = { ...trip };
    this.transitionTarget = null;
    this.transitionRemarks = '';
    this.transitionError = '';
    this.expenseError = '';
    this.expenseMessage = '';
    this.expenses = [];
    this.statusHistory = [];
    this.documents = [];
    this.documentError = '';
    this.documentMessage = '';
    this.newDocument = { documentType: '', fileName: '' };
    this.selectedDocFile = null;
    this.newExpense = this.emptyExpenseForm();
    if (trip.tripId) {
      this.loadExpenses(trip.tripId);
      this.loadStatusHistory(trip.tripId);
      this.loadDocuments(trip.tripId);
    }
  }

  closeDetailPanel(): void {
    this.showDetailPanel = false;
    this.selectedTrip = null;
  }

  // ── Status transitions (via PUT update) ───────────────────────────────
  getAllowedTransitions(trip: Trip): TripStatus[] {
    const status = (trip.status || '') as TripStatus;
    if (!status) return [];

    if (INTERRUPTION_STATUSES.includes(status)) {
      const prev = trip.previousActiveStatus as TripStatus | undefined;
      if (prev) return [prev, 'CANCELLED'];
      const history = [...this.statusHistory].reverse();
      const lastActive = history.find(h =>
        h.newStatus && !INTERRUPTION_STATUSES.includes(h.newStatus as TripStatus) && h.newStatus !== 'CANCELLED'
      );
      return lastActive?.newStatus ? [lastActive.newStatus as TripStatus, 'CANCELLED'] : ['CANCELLED'];
    }

    return TRIP_STATUS_TRANSITIONS[status] || [];
  }

  selectTransition(target: TripStatus): void {
    this.transitionTarget = target;
    this.transitionRemarks = '';
    this.transitionError = '';
  }

  cancelTransition(): void {
    this.transitionTarget = null;
    this.transitionRemarks = '';
  }

  confirmTransition(): void {
    if (!this.selectedTrip?.tripId || !this.transitionTarget) return;
    this.isTransitioning = true;
    this.transitionError = '';

    const payload: any = {
      ...this.selectedTrip,
      tripId:  this.selectedTrip.tripId,
      status:  this.transitionTarget,
      remarks: this.transitionRemarks || this.selectedTrip.remarks || '',
    };

    this.tripService.updateTrip(this.selectedTrip.tripId, payload).subscribe({
      next: response => {
        this.isTransitioning = false;
        const updated = response?.data || response;
        this.selectedTrip = {
          ...this.selectedTrip,
          ...(updated || {}),
          status: updated?.status || this.transitionTarget!,
        };
        this.transitionTarget = null;
        this.transitionRemarks = '';
        if (this.selectedTrip?.tripId) {
          this.loadStatusHistory(this.selectedTrip.tripId);
        }
        this.loadTrips();
      },
      error: err => {
        console.error('Transition failed:', err);
        this.isTransitioning = false;
        this.transitionError = err.error?.responseMessege || err.error?.message || 'Status update failed.';
      }
    });
  }

  getStatusNodeClass(status: TripStatus): string {
    const current = (this.selectedTrip?.status || '') as TripStatus;
    if (!current) return 'pending';
    const currentIdx = TRIP_MAIN_SEQUENCE.indexOf(current);
    const nodeIdx    = TRIP_MAIN_SEQUENCE.indexOf(status);
    if (nodeIdx < currentIdx) return 'done';
    if (nodeIdx === currentIdx) return 'active';
    return 'pending';
  }

  isInterruptionStatus(status: string | undefined | null): boolean {
    return !!status && INTERRUPTION_STATUSES.includes(status as TripStatus);
  }

  getInterruptionClass(status: string | undefined | null): string {
    if (status === 'BREAKDOWN') return 'interruption-red';
    if (status === 'ON_HOLD')   return 'interruption-amber';
    if (status === 'DELAYED')   return 'interruption-orange';
    if (status === 'CANCELLED') return 'interruption-red';
    return '';
  }

  getTransitionLabel(status: TripStatus): string {
    const labels: Partial<Record<TripStatus, string>> = {
      DRIVER_ASSIGNED:     'Assign Driver',
      VEHICLE_ASSIGNED:    'Assign Vehicle',
      READY_FOR_DISPATCH:  'Ready for Dispatch',
      STARTED:             'Start Trip',
      REACHED_PICKUP:      'Reached Pickup',
      LOADING:             'Begin Loading',
      IN_TRANSIT:          'In Transit',
      REACHED_DESTINATION: 'Reached Destination',
      UNLOADING:           'Begin Unloading',
      COMPLETED:           'Complete',
      CLOSED:              'Close Trip',
      ON_HOLD:             'Put On Hold',
      BREAKDOWN:           'Mark Breakdown',
      DELAYED:             'Mark Delayed',
      CANCELLED:           'Cancel Trip',
    };
    return labels[status] || formatStatusStr(status);
  }

  getTransitionButtonClass(status: TripStatus): string {
    if (status === 'CANCELLED') return 'btn-transition btn-danger';
    if (INTERRUPTION_STATUSES.includes(status)) return 'btn-transition btn-warn';
    return 'btn-transition btn-primary';
  }

  // ── Expenses ──────────────────────────────────────────────────────────
  loadExpenses(tripId: number): void {
    this.isLoadingExpenses = true;
    this.tripService.getExpensesByTrip(tripId).subscribe({
      next: res => {
        this.expenses = this.extract(res) as TripExpense[];
        this.isLoadingExpenses = false;
      },
      error: () => { this.isLoadingExpenses = false; }
    });
  }

  get totalExpenseAmount(): number {
    return this.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }

  addExpense(): void {
    if (!this.selectedTrip?.tripId) return;
    if (!this.newExpense.expenseType) { this.expenseError = 'Select an expense type.'; return; }
    if (!this.newExpense.amount || this.newExpense.amount <= 0) { this.expenseError = 'Enter a valid amount.'; return; }

    this.isAddingExpense = true;
    this.expenseError = '';
    const payload: AddExpensePayload = {
      tripId:      this.selectedTrip.tripId,
      expenseType: this.newExpense.expenseType,
      amount:      this.newExpense.amount,
      description: this.newExpense.description || undefined,
      billNumber:  this.newExpense.billNumber  || undefined,
      receiptUrl:  this.newExpense.receiptUrl  || undefined,
      expenseDate: this.newExpense.expenseDate  || undefined,
    };

    this.tripService.createExpense(payload).subscribe({
      next: () => {
        this.isAddingExpense = false;
        this.expenseMessage = 'Expense added.';
        this.newExpense = this.emptyExpenseForm();
        this.loadExpenses(this.selectedTrip!.tripId!);
        setTimeout(() => this.expenseMessage = '', 3000);
      },
      error: err => {
        this.isAddingExpense = false;
        this.expenseError = err.error?.message || 'Failed to add expense.';
      }
    });
  }

  deleteExpense(expense: TripExpense): void {
    const ref = this.dialog.open(DialogboxComponent, {
      width: '400px',
      disableClose: true,
      data: { title: 'Delete Expense', message: 'Remove this expense entry?', confirmText: 'Delete', cancelText: 'Cancel' }
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed || !expense.expenseId) return;
      this.tripService.deleteExpense(expense.expenseId).subscribe({
        next: () => this.loadExpenses(this.selectedTrip!.tripId!),
        error: err => { this.expenseError = err.error?.message || 'Failed to delete expense.'; }
      });
    });
  }

  approveExpense(expense: TripExpense): void {
    if (!expense.expenseId) return;
    this.expenseError = '';
    const payload = { ...expense, approved: true };
    this.tripService.updateExpense(expense.expenseId, payload).subscribe({
      next: () => {
        this.expenseMessage = 'Expense approved.';
        this.loadExpenses(this.selectedTrip!.tripId!);
        setTimeout(() => this.expenseMessage = '', 3000);
      },
      error: err => { this.expenseError = err.error?.message || 'Failed to approve expense.'; }
    });
  }

  // ── Documents ─────────────────────────────────────────────────────────
  loadDocuments(tripId: number): void {
    this.isLoadingDocuments = true;
    this.tripService.getDocumentsByTrip(tripId).subscribe({
      next: res => {
        this.documents = this.extract(res) as TripDocument[];
        this.isLoadingDocuments = false;
      },
      error: () => { this.isLoadingDocuments = false; }
    });
  }

  onDocFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedDocFile = input.files[0];
      this.newDocument.fileName = input.files[0].name;
    }
  }

  uploadDocument(): void {
    if (!this.selectedTrip?.tripId) return;
    if (!this.newDocument.documentType) { this.documentError = 'Select a document type.'; return; }
    if (!this.selectedDocFile) { this.documentError = 'Choose a file to upload.'; return; }

    this.isUploadingDocument = true;
    this.documentError = '';
    this.tripService.uploadDocument(
      this.selectedTrip.tripId,
      this.newDocument.documentType,
      this.selectedDocFile
    ).subscribe({
      next: () => {
        this.isUploadingDocument = false;
        this.documentMessage = 'Document uploaded.';
        this.newDocument = { documentType: '', fileName: '' };
        this.selectedDocFile = null;
        this.loadDocuments(this.selectedTrip!.tripId!);
        setTimeout(() => this.documentMessage = '', 3000);
      },
      error: err => {
        this.isUploadingDocument = false;
        this.documentError = err.error?.message || 'Upload failed.';
      }
    });
  }

  downloadDocument(doc: TripDocument): void {
    if (!doc.id) return;
    this.tripService.downloadDocument(doc.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.fileName || `document-${doc.id}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => { this.documentError = 'Download failed.'; }
    });
  }

  deleteDocument(doc: TripDocument): void {
    const ref = this.dialog.open(DialogboxComponent, {
      width: '400px',
      disableClose: true,
      data: { title: 'Delete Document', message: 'Remove this document?', confirmText: 'Delete', cancelText: 'Cancel' }
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed || !doc.id) return;
      this.tripService.deleteDocument(doc.id).subscribe({
        next: () => this.loadDocuments(this.selectedTrip!.tripId!),
        error: err => { this.documentError = err.error?.message || 'Failed to delete document.'; }
      });
    });
  }

  // ── Status history ────────────────────────────────────────────────────
  loadStatusHistory(tripId: number): void {
    this.isLoadingHistory = true;
    this.tripService.getStatusHistoryByTrip(tripId).subscribe({
      next: res => {
        this.statusHistory = (this.extract(res) as any[]).sort((a, b) =>
          new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime()
        );
        this.isLoadingHistory = false;
      },
      error: () => { this.isLoadingHistory = false; }
    });
  }

  getHistoryDotClass(entry: any): string {
    const s = entry.newStatus as TripStatus;
    if (s === 'CANCELLED') return 'dot-red';
    if (INTERRUPTION_STATUSES.includes(s)) return 'dot-amber';
    if (s === 'COMPLETED' || s === 'CLOSED') return 'dot-green';
    return 'dot-blue';
  }

  formatDateTime(dt: string | undefined | null): string {
    if (!dt) return '—';
    try {
      return new Date(dt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return dt; }
  }

  // ── Delete trip ───────────────────────────────────────────────────────
  deleteTrip(trip: Trip): void {
    const ref = this.dialog.open(DialogboxComponent, {
      width: '420px',
      disableClose: true,
      data: {
        title: 'Delete Trip',
        message: `Delete trip ${trip.tripNumber || '#' + trip.tripId}?`,
        confirmText: 'Delete', cancelText: 'Cancel'
      }
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed || !trip.tripId) return;
      this.tripService.deleteTrip(trip.tripId).subscribe({
        next: () => {
          if (this.selectedTrip?.tripId === trip.tripId) this.closeDetailPanel();
          this.loadTrips();
        },
        error: err => { this.loadError = err.error?.message || 'Failed to delete trip.'; }
      });
    });
  }

  // ── Pagination ────────────────────────────────────────────────────────
  goToPage(page: number): void {
    const total = this.getDisplayTotalPages();
    if (page < 0 || page >= total || page === this.currentPageNumber) return;
    this.currentPageNumber = page;
    this.loadTrips(page);
  }

  changePageSize(): void {
    this.currentPageNumber = 0;
    this.loadTrips(0);
  }

  get visiblePageNumbers(): number[] {
    const total   = this.getDisplayTotalPages();
    const current = this.getDisplayCurrentPage();
    const start   = Math.max(1, current - 2);
    const end     = Math.min(total, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  getDisplayCurrentPage(): number  { return this.currentPageNumber + 1; }
  getDisplayTotalPages(): number   { return this.totalPages || (this.trips.length > 0 ? 1 : 0); }
  getDisplayTotalRecords(): number { return this.totalRecords || this.trips.length; }

  // ── Display helpers ───────────────────────────────────────────────────
  getCustomerName(trip: Trip): string {
    return trip.customerName || (trip.customerId ? `Customer #${trip.customerId}` : '—');
  }

  getDriverName(trip: Trip): string {
    return trip.driverName || (trip.driverId ? `Driver #${trip.driverId}` : '—');
  }

  getVehicleReg(trip: Trip): string {
    return trip.vehicleRegistrationNumber || (trip.vehicleId ? `#${trip.vehicleId}` : '—');
  }

  getCustomerLabelById(id: any): string {
    if (!id) return '—';
    const c = this.customerList.find((x: any) => x.customerId === id || x.id === id);
    if (!c) return `#${id}`;
    return `${c.firstName || c.name || ''} ${c.lastName || ''}`.trim() || `#${id}`;
  }

  getDriverById(id: any): string {
    if (!id) return '—';
    const d = this.driverList.find((x: any) => x.id === id);
    if (!d) return `#${id}`;
    return d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim() || `#${id}`;
  }

  getVehicleById(id: any): string {
    if (!id) return '—';
    const v = this.vehicleList.find((x: any) => x.id === id);
    if (!v) return `#${id}`;
    return v.registrationNumber || v.vehicleNumber || `#${id}`;
  }

  getShiftingLabel(id: any): string {
    if (!id) return '—';
    for (const c of this.customerList) {
      const s = (c.shiftings || []).find((x: any) => x.shiftingId === id || x.id === id);
      if (s) return `${s.shiftFromCity || '?'} → ${s.shiftToCity || '?'}`;
    }
    return `#${id}`;
  }

  formatStatus(status: string | undefined | null): string {
    if (!status) return '';
    return status.split('_').join(' ');
  }

  getTripStatusClass(status: string | undefined | null): string {
    return 'trip-status-' + (status || 'CREATED').toLowerCase().split('_').join('-');
  }

  // ── Privates ──────────────────────────────────────────────────────────
  private extract(response: any): any[] {
    if (!response) return [];
    if (Array.isArray(response?.data?.content)) return response.data.content;
    if (Array.isArray(response?.dataList))       return response.dataList;
    if (Array.isArray(response?.data))            return response.data;
    if (Array.isArray(response))                  return response;
    return [];
  }

  private updatePagination(response: any, loadedCount: number): void {
    const p = response?.data;
    this.totalRecords      = p?.totalElements ?? loadedCount;
    this.currentPageNumber = p?.number        ?? 0;
    this.totalPages        = p?.totalPages    ?? 1;
  }

  private emptyTripForm(): any {
    return {
      customerId: null, customerShiftings: [], shiftingId: null,
      driverId: null, vehicleId: null,
      plannedStartTime: '', plannedEndTime: '',
      plannedDistanceKm: null,
      remarks: '',
      sourceCity: '', destinationCity: '',
    };
  }

  private emptyExpenseForm(): any {
    return { expenseType: '', amount: null, description: '', billNumber: '', receiptUrl: '', expenseDate: '' };
  }
}

function formatStatusStr(s: string): string {
  return s.split('_').join(' ');
}
