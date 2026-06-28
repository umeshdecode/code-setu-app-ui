import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CustomerModels } from 'src/app/models/customer-models';
import { CompanyService } from 'src/app/services/company.service';
import { CustomersService } from 'src/app/services/customers.service';
import { StaffuserServiceService } from 'src/app/services/staffuser-service';
import { TemplateService } from 'src/app/services/template.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogboxComponent } from '../dialogbox/dialogbox.component';

type ConnectionStatus = 'Online' | 'Offline';
type CustomerRow = CustomerModels & {
  username: string;
  serviceArea: string;
  accountNo: string;
  isp: string;
  connectionStatus: ConnectionStatus;
};

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.css']
})
export class CustomerComponent implements OnInit {
  customers: CustomerRow[] = [];

  searchText = '';
  selectedArea = 'Any';
  selectedStatus = 'All';
  startDate = '';
  endDate = '';
  isLoading = false;
  loadError = '';
  isDeleting = false;
  deleteMessage = '';
  deleteError = '';
  private messageTimer: any;
  downloadingQuotationId: number | string | null = null;
  isGeneratingDocument = false;
  staffList: any[] = [];
  staffLoadError = '';
  companyList: any[] = [];
  shiftingTypes: any[] = [];

  companyLoadError = '';

  // ── Create Form ─────────────────────────────────────────────────────
  showCreateForm = false;
  isCreating = false;
  createMessage = '';
  createError = '';
  newCustomer = this.getEmptyCustomerForm();
  createStep = 0;
  createSteps = ['Customer details', 'Shifting details', 'Charges', 'Review'];
  activeShiftIndex = 0;

  // ── Update Form ─────────────────────────────────────────────────────
  showUpdateForm = false;
  isUpdating = false;
  updateMessage = '';
  updateError = '';
  customerToUpdate = this.getEmptyCustomerForm();
  updateStep = 0;
  updateSteps = ['Customer details', 'Shifting details', 'Charges', 'Review'];
  activeUpdateShiftIndex = 0;

  pageSize = 5;
  pageRecords = 0;
  totalRecords = 0;
  currentPageNumber = 0;
  totalPages = 0;

  countryCodes: any[] = [
    { name: 'India', code: '+91', cca2: 'IN' },
    { name: 'USA', code: '+1', cca2: 'US' },
    { name: 'UK', code: '+44', cca2: 'GB' },
    { name: 'UAE', code: '+971', cca2: 'AE' }
  ];

  constructor(
    private companyService: CompanyService,
    private customersService: CustomersService,
    private staffService: StaffuserServiceService,
    private templateService: TemplateService,
    private dialog: MatDialog,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.loadCountryCodes();
    this.loadCustomers();
    this.loadStaffList();
    this.loadCompanyList();
    this.loadShiftingTypes();
  }
  loadShiftingTypes() {
    this.customersService.getShiftType().subscribe({
      next: response => {
        const types = response?.data ?? response?.dataList ?? response;
        this.shiftingTypes = Array.isArray(types) ? types : [];
        console.log('Shifting types loaded:', this.shiftingTypes);
      },
      error: error => {
        console.error('Failed to load shifting types:', error);
        this.shiftingTypes = [];
      }
    });
  }

  get visiblePageNumbers(): number[] {
    const total = this.getDisplayTotalPages();
    const current = this.getDisplayCurrentPage();
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  get serviceAreas(): string[] {
    return Array.from(new Set(this.customers.map(c => c.serviceArea).filter(Boolean)));
  }

  get filteredCustomers(): CustomerRow[] {
    const search = this.searchText.trim().toLowerCase();
    const start = this.startDate ? new Date(this.startDate) : null;
    const end = this.endDate ? new Date(this.endDate) : null;

    return this.customers.filter(customer => {
      const searchableText = [
        this.getCustomerName(customer),
        customer.username, customer.serviceArea, customer.accountNo,
        customer.isp, customer.mobileNo, customer.email,
        customer.shiftFromCity, customer.shiftToCity, customer.customerId
      ].join(' ').toLowerCase();
      const shiftingDate = customer.shiftingStartDate ? new Date(customer.shiftingStartDate) : null;

      return (
        (!search || searchableText.includes(search)) &&
        (this.selectedArea === 'Any' || customer.serviceArea === this.selectedArea) &&
        (this.selectedStatus === 'All' || customer.connectionStatus === this.selectedStatus) &&
        (!start || (shiftingDate !== null && shiftingDate >= start)) &&
        (!end   || (shiftingDate !== null && shiftingDate <= end))
      );
    });
  }

  getCustomerName(customer: CustomerModels): string {
    return [customer.firstName, customer.lastName].filter(Boolean).join(' ') || 'Customer';
  }
    getSerialNumber(customer: CustomerModels): string {
    return [customer.firstName, customer.lastName].filter(Boolean).join(' ') || 'Customer';
  }

  getStatusClass(customer: CustomerRow): string {
    return customer.connectionStatus === 'Online' ? 'online' : 'offline';
  }

  getStaffName(staff: any): string {
    return [staff?.firstName, staff?.lastName].filter(Boolean).join(' ') || staff?.userName || staff?.email || 'Staff';
  }

  setShiftCompletedBy(shifting: any, staffId: number | string | null): void {
    const selectedStaff = this.staffList.find(staff => String(staff.staffId) === String(staffId));
    shifting.shiftCompletedById = staffId || null;
    shifting.shiftCompletedBy = selectedStaff ? this.getStaffName(selectedStaff) : '';
  }

  getCompanyName(company: any): string {
    return company?.companyName || company?.name || company?.companyEmail || 'Company';
  }

  setShiftingCompany(shifting: any, companyId: number | string | null): void {
    const selectedCompany = this.companyList.find(company => String(company.companyId) === String(companyId));
    shifting.companyId = companyId || null;
    shifting.companyName = selectedCompany ? this.getCompanyName(selectedCompany) : '';
  }

  loadCustomers(pageNumber = this.currentPageNumber): void {
    this.isLoading = true;
    this.loadError = '';
    this.customersService.getCustomers(pageNumber, this.pageSize).subscribe({
      next: response => {
        const customerList = this.extractCustomers(response);
        this.updatePagination(response, customerList.length);
        this.customers = customerList.map(c => this.toCustomerRow(c));
        this.isLoading = false;
      },
      error: error => {
        console.error('Customer API failed:', error);
        this.loadError = 'Unable to load latest customers.';
        this.isLoading = false;
      }
    });
  }

  loadStaffList(): void {
    this.staffLoadError = '';
    this.staffService.getAllStaff(0, 10).subscribe({
      next: response => {
        this.staffList = this.extractStaff(response);
      },
      error: error => {
        console.error('Staff API failed:', error);
        this.staffLoadError = 'Unable to load staff list.';
        this.staffList = [];
      }
    });
  }

  loadCompanyList(): void {
    this.companyLoadError = '';
    this.companyService.getCompany().subscribe({
      next: response => {
        this.companyList = this.extractCompanies(response);
      },
      error: error => {
        console.error('Company API failed:', error);
        this.companyLoadError = 'Unable to load company list.';
        this.companyList = [];
      }
    });
  }

  goToPage(pageNumber: number): void {
    const total = this.getDisplayTotalPages();
    if (pageNumber < 0 || pageNumber >= total || pageNumber === this.currentPageNumber) return;
    this.currentPageNumber = pageNumber;
    this.loadCustomers(pageNumber);
  }

  changePageSize(): void {
    this.currentPageNumber = 0;
    this.loadCustomers(0);
  }

  // ── Create Form Actions ─────────────────────────────────────────────
  openCreateForm(): void {
    this.showCreateForm = true;
    this.showUpdateForm = false;
    this.createMessage = '';
    this.createError = '';
    this.createStep = 0;
    this.activeShiftIndex = 0;
    this.newCustomer = this.getEmptyCustomerForm();
  }

  closeCreateForm(): void {
    this.showCreateForm = false;
  }

  resetCreateForm(): void {
    this.newCustomer = this.getEmptyCustomerForm();
    this.createMessage = '';
    this.createError = '';
    this.createStep = 0;
    this.activeShiftIndex = 0;
  }

  // ── Create Stepper ──────────────────────────────────────────────────
  get isFirstCreateStep(): boolean { return this.createStep === 0; }
  get isLastCreateStep(): boolean  { return this.createStep === this.createSteps.length - 1; }

  nextCreateStep(): void {
    if (!this.validateCreateStep()) return;
    if (!this.isLastCreateStep) this.createStep++;
  }
  prevCreateStep(): void { if (!this.isFirstCreateStep) this.createStep--; }
  goToCreateStep(index: number): void { if (index < this.createStep) this.createStep = index; }

  validateCreateStep(): boolean {
    if (this.createStep === 0) {
      if (!this.newCustomer.firstName?.trim()) { this.showCreateSnackbar('First name is required', true); return false; }
      if (!this.newCustomer.lastName?.trim())  { this.showCreateSnackbar('Last name is required', true); return false; }
      if (!this.newCustomer.mobileNumber?.trim())  { this.showCreateSnackbar('Mobile number is required', true); return false; }
      if (!this.newCustomer.email?.trim())     { this.showCreateSnackbar('Email is required', true); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.newCustomer.email)) { this.showCreateSnackbar('Enter a valid email address', true); return false; }
    }
    if (this.createStep === 1) {
      for (let i = 0; i < this.newCustomer.shiftings.length; i++) {
        const s = this.newCustomer.shiftings[i];
        if (!s.shiftFromCity?.trim() || !s.shiftToCity?.trim()) {
          this.showCreateSnackbar(`From and To city required for Shifting ${i + 1}`, true);
          this.activeShiftIndex = i;
          return false;
        }
      }
    }
    return true;
  }

  // ── Create Snackbar ─────────────────────────────────────────────────
  createSnackbar = { message: '', error: false, visible: false };
  private createSnackbarTimer: any;

  showCreateSnackbar(message: string, error = false): void {
    clearTimeout(this.createSnackbarTimer);
    this.createSnackbar = { message, error, visible: true };
    this.createSnackbarTimer = setTimeout(() => this.createSnackbar.visible = false, 3500);
  }

  // ── Create Shifting helpers ─────────────────────────────────────────
  getShiftLabel(s: any, i: number): string {
    return s.shiftFromCity && s.shiftToCity ? `${s.shiftFromCity} → ${s.shiftToCity}` : `Shifting ${i + 1}`;
  }

  addShifting(): void {
    this.newCustomer.shiftings.push(this.getEmptyShiftingForm());
    this.activeShiftIndex = this.newCustomer.shiftings.length - 1;
  }

  removeShifting(index: number): void {
    if (this.newCustomer.shiftings.length <= 1) { this.showCreateSnackbar('At least one shifting is required', true); return; }
    this.newCustomer.shiftings.splice(index, 1);
    this.activeShiftIndex = Math.max(0, this.activeShiftIndex - 1);
  }

  addExtraCharge(shiftIndex: number): void {
    this.newCustomer.shiftings[shiftIndex].charges.extracharges.push({ chargeName: '', chargeValue: 0, chargeRate: 0 });
  }

  removeExtraCharge(shiftIndex: number, chargeIndex: number): void {
    this.newCustomer.shiftings[shiftIndex].charges.extracharges.splice(chargeIndex, 1);
  }

  trackByIndex(index: number): number { return index; }

  createCustomer(): void {
    this.isCreating = true;
    this.createMessage = '';
    this.createError = '';
    this.newCustomer.mobileNo = (this.newCustomer.mobileCode || '') + (this.newCustomer.mobileNumber || '');
    this.newCustomer.alternateMobileNo = (this.newCustomer.alternateMobileCode || '') + (this.newCustomer.alternateMobileNumber || '');
    this.customersService.createCustomer(this.newCustomer).subscribe({
      next: () => {
        this.isCreating = false;
        this.createMessage = 'Customer created successfully.';
        this.resetCreateForm();
        this.showCreateForm = false;
        this.loadCustomers();
      },
      error: error => {
        console.error('Create customer failed:', error);
        this.isCreating = false;
        this.createError = error.error?.responseMessege || error.error?.message || 'Unable to create customer.';
      }
    });
  }

  // ── Update Form Actions ─────────────────────────────────────────────
  openUpdateForm(customer: CustomerRow): void {
    this.showCreateForm = false;
    this.showUpdateForm = true;          // open immediately — stays open on error too
    this.updateMessage = '';
    this.updateError = '';
    this.updateStep = 0;
    this.activeUpdateShiftIndex = 0;
    this.isUpdating = false;
    this.customerToUpdate = this.getEmptyCustomerForm(); // blank skeleton while API loads

    if (!customer.uuid) {
      this.updateError = 'No customer identifier (UUID) available for update.';
      return;
    }

    this.customersService.getCustomerByUuid(customer.uuid).subscribe({
      next: (response) => {
        // handle both {data: {...}} and direct object responses
        const d = response?.data || response;
        if (!d) { this.updateError = 'Failed to load customer details.'; return; }

        const parsedMobile = this.parsePhoneNumber(d.mobileNo || '');
        const parsedAlternate = this.parsePhoneNumber(d.alternateMobileNo || '');

        this.customerToUpdate = {
          customerId: d.customerId,
          firstName: d.firstName || '',
          lastName: d.lastName || '',
          mobileCode: parsedMobile.code,
          mobileNumber: parsedMobile.number,
          alternateMobileCode: parsedAlternate.code,
          alternateMobileNumber: parsedAlternate.number,
          mobileNo: d.mobileNo || '',
          alternateMobileNo: d.alternateMobileNo || '',
          email: d.email || '',
          workEmail: d.workEmail || '',
          uuid: d.uuid || '',
          shiftings: (d.shiftings && d.shiftings.length > 0)
            ? d.shiftings.map((s: any) => {
              // API sends chargesDTO; locally we use charges — normalise here
              const src = s.chargesDTO || s.charges || {};
              return {
                ...s,
                charges: {
                  transportCharge:    src.transportCharge    ?? 0,
                  packingCharge:      src.packingCharge      ?? 0,
                  loadingCharge:      src.loadingCharge      ?? 0,
                  unloadingCharge:    src.unloadingCharge    ?? 0,
                  unpackingCharge:    src.unpackingCharge    ?? 0,
                  carTransportCharge: src.carTransportCharge ?? 0,
                  riskInsureCharge:   src.riskInsureCharge   ?? 0,
                  storageCharge:      src.storageCharge      ?? 0,
                  statisticalCharge:  src.statisticalCharge  ?? 0,
                  serviceCharge:      src.serviceCharge      ?? 0,
                  serviceRate:        src.serviceRate        ?? 0,
                  gstRate:            src.gstRate            ?? 18,
                  gstCharge:          src.gstCharge          ?? 0,
                  // API may use extraChargesList (capital L) — normalise to extracharges
                  extracharges: (src.extraChargesList || src.extracharges || []).map((e: any) => ({
                    chargeName:  e.chargeName  || '',
                    chargeValue: e.chargeValue ?? 0,
                    chargeRate:  e.chargeRate  ?? 0
                  }))
                }
              };
            })
            : [this.getEmptyShiftingForm()]
        };
        // Normalise dates to YYYY-MM-DD for <input type="date">
        this.customerToUpdate.shiftings.forEach((s: any) => {
          s.shiftingStartDate = s.shiftingStartDate ? new Date(s.shiftingStartDate).toISOString().slice(0, 10) : '';
          s.shiftReachedDate  = s.shiftReachedDate  ? new Date(s.shiftReachedDate).toISOString().slice(0, 10)  : '';
        });
      },
      error: (error) => {
        console.error('Error fetching customer for update:', error);
        // form stays open so the error message is visible
        this.updateError = error.error?.responseMessege || error.error?.message || 'Unable to load customer for update.';
      }
    });
  }

  closeUpdateForm(): void {
    this.showUpdateForm = false;
  }

  resetUpdateForm(): void {
    this.customerToUpdate = this.getEmptyCustomerForm();
    this.updateMessage = '';
    this.updateError = '';
    this.updateStep = 0;
    this.activeUpdateShiftIndex = 0;
  }

  // ── Update Stepper ──────────────────────────────────────────────────
  get isFirstUpdateStep(): boolean { return this.updateStep === 0; }
  get isLastUpdateStep(): boolean  { return this.updateStep === this.updateSteps.length - 1; }

  nextUpdateStep(): void {
    if (!this.validateUpdateStep()) return;
    if (!this.isLastUpdateStep) this.updateStep++;
  }
  prevUpdateStep(): void { if (!this.isFirstUpdateStep) this.updateStep--; }
  goToUpdateStep(index: number): void { if (index < this.updateStep) this.updateStep = index; }

  validateUpdateStep(): boolean {
    if (this.updateStep === 0) {
      if (!this.customerToUpdate.firstName?.trim()) { this.showUpdateSnackbar('First name is required', true); return false; }
      if (!this.customerToUpdate.lastName?.trim())  { this.showUpdateSnackbar('Last name is required', true); return false; }
      if (!this.customerToUpdate.mobileNumber?.trim())  { this.showUpdateSnackbar('Mobile number is required', true); return false; }
      if (!this.customerToUpdate.email?.trim())     { this.showUpdateSnackbar('Email is required', true); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.customerToUpdate.email)) { this.showUpdateSnackbar('Enter a valid email address', true); return false; }
    }
    if (this.updateStep === 1) {
      for (let i = 0; i < this.customerToUpdate.shiftings.length; i++) {
        const s = this.customerToUpdate.shiftings[i];
        if (!s.shiftFromCity?.trim() || !s.shiftToCity?.trim()) {
          this.showUpdateSnackbar(`From and To city required for Shifting ${i + 1}`, true);
          this.activeUpdateShiftIndex = i;
          return false;
        }
      }
    }
    return true;
  }

  // ── Update Snackbar ─────────────────────────────────────────────────
  updateSnackbar = { message: '', error: false, visible: false };
  private updateSnackbarTimer: any;

  showUpdateSnackbar(message: string, error = false): void {
    clearTimeout(this.updateSnackbarTimer);
    this.updateSnackbar = { message, error, visible: true };
    this.updateSnackbarTimer = setTimeout(() => this.updateSnackbar.visible = false, 3500);
  }

  // ── Update Shifting helpers ─────────────────────────────────────────
  addUpdateShifting(): void {
    this.customerToUpdate.shiftings.push(this.getEmptyShiftingForm());
    this.activeUpdateShiftIndex = this.customerToUpdate.shiftings.length - 1;
  }

  removeUpdateShifting(index: number): void {
    if (this.customerToUpdate.shiftings.length <= 1) { this.showUpdateSnackbar('At least one shifting is required', true); return; }
    this.customerToUpdate.shiftings.splice(index, 1);
    this.activeUpdateShiftIndex = Math.max(0, this.activeUpdateShiftIndex - 1);
  }

  addUpdateExtraCharge(shiftIndex: number): void {
    this.customerToUpdate.shiftings[shiftIndex].charges.extracharges.push({ chargeName: '', chargeValue: 0, chargeRate: 0 });
  }

  removeUpdateExtraCharge(shiftIndex: number, chargeIndex: number): void {
    this.customerToUpdate.shiftings[shiftIndex].charges.extracharges.splice(chargeIndex, 1);
  }

  updateCustomer(): void {
    this.isUpdating = true;
    this.updateMessage = '';
    this.updateError = '';

    const payload = {
      customerId: this.customerToUpdate.customerId,
      firstName: this.customerToUpdate.firstName,
      lastName: this.customerToUpdate.lastName,
      mobileNo: (this.customerToUpdate.mobileCode || '') + (this.customerToUpdate.mobileNumber || ''),
      alternateMobileNo: (this.customerToUpdate.alternateMobileCode || '') + (this.customerToUpdate.alternateMobileNumber || ''),
      email: this.customerToUpdate.email,
      workEmail: this.customerToUpdate.workEmail,
      uuid: this.customerToUpdate.uuid,
      shiftings: this.customerToUpdate.shiftings.map((s: any) => ({
        ...s,
        chargesDTO: s.charges  // send back as chargesDTO to match API
      }))
    };

    this.customersService.updateCustomer(payload).subscribe({
      next: () => {
        this.isUpdating = false;
        this.updateMessage = 'Customer updated successfully.';
        this.showUpdateForm = false;
        this.loadCustomers();
      },
      error: error => {
        console.error('Update customer failed:', error);
        this.isUpdating = false;
        this.updateError = error.error?.responseMessege || error.error?.message || 'Unable to update customer.';
      }
    });
  }

  // ── Private helpers ─────────────────────────────────────────────────
  private extractCustomers(response: any): any[] {
    if (!response) return [];
    if (Array.isArray(response?.data?.content)) return response.data.content;
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.dataList)) return response.dataList;
    if (Array.isArray(response?.data)) return response.data;
    console.warn('Unknown response format:', response);
    return [];
  }

  private extractStaff(response: any): any[] {
    if (!response) return [];
    if (Array.isArray(response?.data?.content)) return response.data.content;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.dataList)) return response.dataList;
    if (Array.isArray(response)) return response;
    return [];
  }

  private extractCompanies(response: any): any[] {
    if (!response) return [];
    if (Array.isArray(response?.data?.content)) return response.data.content;
    if (Array.isArray(response?.dataList)) return response.dataList;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response)) return response;
    return [];
  }

  private updatePagination(response: any, loadedRecords: number): void {
    const pageData = response?.data;
    this.pageRecords       = pageData?.numberOfElements ?? loadedRecords;
    this.totalRecords      = pageData?.totalElements    ?? loadedRecords;
    this.currentPageNumber = pageData?.number           ?? 0;
    this.totalPages        = pageData?.totalPages       ?? 1;
  }

  getDisplayCurrentPage(): number  { return this.currentPageNumber + 1; }
  getDisplayTotalPages(): number   { return this.totalPages || (this.filteredCustomers.length > 0 ? 1 : 0); }
  getDisplayTotalRecords(): number { return this.totalRecords || this.filteredCustomers.length; }

  private toCustomerRow(customer: any): CustomerRow {
    const firstName = customer.firstName || customer.name || customer.customerName || 'Customer';
    const lastName = customer.lastName || '';
    const username = customer.username || customer.userName || customer.accountNo || customer.accountNumber || '';
    const serviceArea = customer.serviceArea || customer.shiftings?.[0]?.shiftFromCity || 'ACT';
    const accountNo = customer.accountNo || customer.accountNumber || username || String(customer.customerId || '');
    const rawStatus = customer.status || customer.connectionStatus || (customer.shiftings?.[0]?.isShiftCompleted ? 'Online' : 'Offline');
    const connectionStatus: ConnectionStatus = String(rawStatus).toLowerCase() === 'online' ? 'Online' : 'Offline';

    return {
      ...customer,
      firstName, lastName, username, serviceArea, accountNo,
      isp: customer.isp || customer.ispName || 'admin',
      connectionStatus,
      mobileNo: customer.mobileNo || customer.mobile || customer.mobileNumber || ''
    };
  }

  clearFilters(): void {
    this.searchText = '';
    this.selectedArea = 'Any';
    this.selectedStatus = 'All';
    this.startDate = '';
    this.endDate = '';
  }

  exportCustomers(): void {
    const rows = this.filteredCustomers.map(customer => [
      customer.customerId || '',
      this.getCustomerName(customer),
      customer.username,
      customer.mobileNo || '',
      customer.accountNo,
      customer.serviceArea,
      customer.connectionStatus,
      customer.isp
    ]);
    const csv = [
      ['Customer ID', 'Name', 'Username', 'Mobile', 'Account No', 'Service Area', 'Connection Status', 'ISP Name'],
      ...rows
    ].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'customers.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  deleteCustomer(customer: CustomerRow): void {
    const dialogRef = this.dialog.open(DialogboxComponent, {
      width: '420px',
      disableClose: true,
      data: {
        title: 'Delete Customer',
        message: 'Are you sure you want to delete this customer?',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) {
        return;
      }

      const payload = {
        customerId: customer.customerId || 0,
        firstName: customer.firstName || '',
        lastName: customer.lastName || '',
        mobileNo: customer.mobileNo || '',
        alternateMobileNo: customer.alternateMobileNo || '',
        email: customer.email || '',
        workEmail: customer.workEmail || '',
        uuid: customer.uuid || ''
      };

      this.isDeleting = true;
      this.deleteMessage = '';
      this.deleteError = '';
      this.customersService.deleteCustomer(payload).subscribe({
        next: () => {
          this.isDeleting = false;
          this.showMessage('Customer deleted successfully.');
          this.loadCustomers();
        },
        error: error => {
          console.error('Delete customer failed:', error);
          this.isDeleting = false;
          this.showError(error.error?.responseMessege || error.error?.message || 'Unable to delete customer.');
        }
      });
    });
  }

  generateQuotation(customer: CustomerRow): void {
    this.downloadCustomerQuotation(customer);
  }

  generateInvoice(customer: CustomerRow): void {
    const shiftingId = this.getCustomerShiftingId(customer);
    if (!shiftingId) { this.showError('No shifting id found for this customer.'); return; }
    this.downloadingQuotationId = shiftingId;
    this.isGeneratingDocument = true;
    this.templateService.getInvoicePdf(shiftingId).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, `invoice-${shiftingId}.pdf`);
        this.showMessage('Invoice PDF downloaded successfully.');
        this.downloadingQuotationId = null;
        this.isGeneratingDocument = false;
      },
      error: (error) => {
        console.error('Invoice PDF download failed:', error);
        this.showError('Unable to generate invoice PDF.');
        this.downloadingQuotationId = null;
        this.isGeneratingDocument = false;
      }
    });
  }

  generateLRCopy(customer: CustomerRow): void {
    const shiftingId = this.getCustomerShiftingId(customer);
    if (!shiftingId) { this.showError('No shifting id found for this customer.'); return; }
    this.downloadingQuotationId = shiftingId;
    this.isGeneratingDocument = true;
    this.templateService.getLRCopyPdf(shiftingId).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, `lr-copy-${shiftingId}.pdf`);
        this.showMessage('LR Copy downloaded successfully.');
        this.downloadingQuotationId = null;
        this.isGeneratingDocument = false;
      },
      error: (error) => {
        console.error('LR Copy download failed:', error);
        this.showError('Unable to generate LR Copy.');
        this.downloadingQuotationId = null;
        this.isGeneratingDocument = false;
      }
    });
  }

  generateItemList(customer: CustomerRow): void {
    const shiftingId = this.getCustomerShiftingId(customer);
    if (!shiftingId) { this.showError('No shifting id found for this customer.'); return; }
    this.downloadingQuotationId = shiftingId;
    this.isGeneratingDocument = true;
    this.templateService.getItemListPdf(shiftingId).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, `item-list-${shiftingId}.pdf`);
        this.showMessage('Item List downloaded successfully.');
        this.downloadingQuotationId = null;
        this.isGeneratingDocument = false;
      },
      error: (error) => {
        console.error('Item List download failed:', error);
        this.showError('Unable to generate Item List.');
        this.downloadingQuotationId = null;
        this.isGeneratingDocument = false;
      }
    });
  }

  downloadCustomerQuotation(customer: CustomerRow): void {
    const shiftingId = this.getCustomerShiftingId(customer);

    this.deleteMessage = '';
    this.deleteError = '';

    if (!shiftingId) {
      this.showError('No shifting id found for this customer.');
      return;
    }

    this.downloadingQuotationId = shiftingId;
    this.isGeneratingDocument = true;
    this.templateService.getQuotationPdf(shiftingId).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, `quotation-${shiftingId}.pdf`);
        this.showMessage('Quotation PDF downloaded successfully.');
        this.downloadingQuotationId = null;
        this.isGeneratingDocument = false;
      },
      error: (error) => {
        console.error('Quotation PDF download failed:', error);
        this.showError('Unable to generate quotation PDF.');
        this.downloadingQuotationId = null;
        this.isGeneratingDocument = false;
      }
    });
  }

  isQuotationDownloading(customer: CustomerRow): boolean {
    const shiftingId = this.getCustomerShiftingId(customer);
    return !!shiftingId && this.downloadingQuotationId === shiftingId;
  }

  private getCustomerShiftingId(customer: any): number | string | null {
    return customer?.shiftingId
      || customer?.shiftId
      || customer?.shiftings?.[0]?.shiftingId
      || customer?.shiftings?.[0]?.id
      || null;
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  private showMessage(msg: string): void {
    this.deleteMessage = msg;
    this.deleteError = '';
    clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => this.deleteMessage = '', 3000);
  }

  private showError(msg: string): void {
    this.deleteError = msg;
    this.deleteMessage = '';
    clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => this.deleteError = '', 3000);
  }

  private getEmptyShiftingForm(): any {
    return {
      isShiftCompleted: false,
      shiftFromCity: '',
      shiftToCity: '',
      fromAddress: '',
      toAddress: '',
      shiftingType: '',
      companyId: null,
      companyName: '',
      shiftingStartDate: new Date().toISOString().slice(0, 10),
      shiftReachedDate: '',
      shiftCompletedBy: '',
      shiftCompletedById: null,
      customerId: null,
      charges: {
        transportCharge: 0,
        packingCharge: 0,
        loadingCharge: 0,
        unloadingCharge: 0,
        unpackingCharge: 0,
        carTransportCharge: 0,
        riskInsureCharge: 0,
        storageCharge: 0,
        statisticalCharge: 0,
        serviceCharge: 0,
        serviceRate: 0,
        gstRate: 18,
        gstCharge: 0,
        extracharges: [
          { chargeName: 'Toll Charge', chargeValue: 0, chargeRate: 0 },
          { chargeName: 'Lift Handling Charge', chargeValue: 0, chargeRate: 0 }
        ]
      }
    };
  }

  private getEmptyCustomerForm(): any {
    return {
      customerId: null,
      firstName: '',
      lastName: '',
      mobileCode: '+91',
      mobileNumber: '',
      alternateMobileCode: '+91',
      alternateMobileNumber: '',
      mobileNo: '',
      alternateMobileNo: '',
      email: '',
      workEmail: '',
      uuid: '',
      shiftings: [this.getEmptyShiftingForm()]
    };
  }

  loadCountryCodes() {
    this.http.get<any[]>('https://restcountries.com/v3.1/all?fields=name,idd,cca2').subscribe({
      next: (countries) => {
        if (Array.isArray(countries)) {
          this.countryCodes = countries
            .map(c => {
              const root = c.idd?.root || '';
              const suffix = c.idd?.suffixes?.[0] || '';
              return {
                name: c.name?.common || '',
                code: root + suffix,
                cca2: c.cca2 || ''
              };
            })
            .filter(c => c.name && c.code)
            .sort((a, b) => a.name.localeCompare(b.name));
        }
      },
      error: (err) => {
        console.error('Failed to load country codes', err);
      }
    });
  }

  parsePhoneNumber(fullNo: string): { code: string, number: string } {
    if (!fullNo) return { code: '+91', number: '' };
    if (fullNo.startsWith('+')) {
      const match = this.countryCodes.find(c => fullNo.startsWith(c.code));
      if (match) {
        return {
          code: match.code,
          number: fullNo.substring(match.code.length)
        };
      }
      const matchRegex = fullNo.match(/^(\+\d{1,4})(\d+)$/);
      if (matchRegex) {
        return {
          code: matchRegex[1],
          number: matchRegex[2]
        };
      }
    }
    return { code: '+91', number: fullNo };
  }
}

