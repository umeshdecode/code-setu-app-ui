import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { RoleserviceService } from 'src/app/services/role/roleservice.service';
import { DialogboxComponent } from '../dialogbox/dialogbox.component';
import { ShowpopupService } from 'src/app/services/showpopup.service';

@Component({
  selector: 'app-permission',
  templateUrl: './permission.component.html',
  styleUrls: ['./permission.component.css']
})
export class PermissionComponent implements OnInit {
  permissions: any[] = [];
  private loadedPermissions: any[] = [];
  permissionForm!: FormGroup;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  selectedId: number | null = null;
  pageIndex = 0;
  pageSize = 10;
  totalRecords = 0;
  totalPages = 0;
  pageRecords = 0;
  searchText = '';
  private serverPaged = false;

  constructor(
    private fb: FormBuilder,
    private roleService: RoleserviceService,
    private showPopup: ShowpopupService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadPermissions();
  }

  buildForm(): void {
    this.permissionForm = this.fb.group({
      name: ['', Validators.required],
      module: ['', Validators.required],
      code: [''],
      description: ['']
    });
  }

  loadPermissions(pageIndex: number = this.pageIndex, pageSize: number = this.pageSize): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;

    this.roleService.getPermissions(this.pageIndex, this.pageSize, this.searchText.trim()).subscribe({
      next: (res: any) => {
        const list = res?.dataList ?? res?.data ?? res ?? [];
        this.loadedPermissions = Array.isArray(list) ? list : [];
        const responseTotal = Number(res?.totalRecords);
        const responseTotalPages = Number(res?.totalPages);
        this.serverPaged = responseTotal > this.loadedPermissions.length || responseTotalPages > 1;

        if (this.serverPaged) {
          this.permissions = this.loadedPermissions;
          this.totalRecords = this.readNumber(res?.totalRecords, this.loadedPermissions.length);
        } else {
          const filteredList = this.filterPermissions(this.loadedPermissions);
          this.totalRecords = filteredList.length;
          this.permissions = this.slicePage(filteredList);
        }

        this.pageRecords = this.permissions.length;
        this.totalPages = this.totalRecords ? Math.ceil(this.totalRecords / this.pageSize) : 0;
        this.pageIndex = this.readNumber(res?.currentPageNumber, this.pageIndex);
        this.isLoading = false;
      },
      error: () => {
        this.permissions = [];
        this.pageRecords = 0;
        this.totalRecords = 0;
        this.totalPages = 0;
        this.errorMessage = 'Unable to load permissions.';
        this.isLoading = false;
      }
    });
  }

  goToPage(pageNumber: number): void {
    this.loadPermissions(pageNumber, this.pageSize);
  }

  changePageSize(newSize: number): void {
    this.loadPermissions(0, newSize);
  }

  searchPermissions(): void {
    this.loadPermissions(0, this.pageSize);
  }

  clearSearch(): void {
    this.searchText = '';
    this.loadPermissions(0, this.pageSize);
  }

  submitPermission(): void {
    if (this.permissionForm.invalid) {
      this.permissionForm.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();
    const wasEdit = !!this.selectedId;
    this.isSaving = true;

    const request = this.selectedId
      ? this.roleService.updatePermission(this.selectedId, payload)
      : this.roleService.createPermission(payload);

    request.subscribe({
      next: (res: any) => {
        this.isSaving = false;
        const message = res?.responseMessege || res?.responseMessage
          || (this.selectedId ? 'Permission updated' : 'Permission created');
        this.showPopup.showResponsePopup(message, res?.responseCode);
        // The backend answers HTTP 200 even on failure (e.g. a duplicate code
        // is a 409 embedded in the body) — only reset/reload on a real success code.
        if (res?.responseCode === 200 || res?.responseCode === 201) {
          this.resetForm();
          this.loadPermissions(wasEdit ? this.pageIndex : 0, this.pageSize);
        }
      },
      error: (err: any) => {
        this.isSaving = false;
        this.showPopup.showApiError(err, 'Permission save failed');
      }
    });
  }

  editPermission(permission: any): void {
    this.selectedId = this.getPermissionId(permission);
    this.permissionForm.patchValue({
      name: permission?.name || permission?.permissionName || permission?.label || '',
      module: permission?.module || '',
      code: permission?.code || permission?.key || permission?.permissionCode || '',
      description: permission?.description || permission?.discription || ''
    });
  }

  deletePermission(permission: any): void {
    const id = this.getPermissionId(permission);
    if (!id) {
      return;
    }

    const dialogRef = this.dialog.open(DialogboxComponent, {
      width: '420px',
      disableClose: true,
      data: {
        title: 'Delete Permission',
        message: 'Are you sure you want to delete this permission?',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) {
        return;
      }

      this.roleService.deletePermission(id).subscribe({
        next: (res: any) => {
          const message = res?.responseMessege || res?.responseMessage || 'Permission deleted';
          this.showPopup.showResponsePopup(message, res?.responseCode);
          if (res?.responseCode !== 200 && res?.responseCode !== 201) return;
          if (this.selectedId === id) {
            this.resetForm();
          }
          const nextPageIndex = this.permissions.length === 1 && this.pageIndex > 0 ? this.pageIndex - 1 : this.pageIndex;
          this.loadPermissions(nextPageIndex, this.pageSize);
        },
        error: (err: any) => this.showPopup.showApiError(err, 'Permission delete failed')
      });
    });
  }

  resetForm(): void {
    this.selectedId = null;
    this.permissionForm.reset();
  }

  getPermissionId(permission: any): number {
    return permission?.id || permission?.permissionId || permission?.permissionsId || 0;
  }

  getPermissionName(permission: any): string {
    return permission?.name
      || permission?.label
      || permission?.permissionName
      || permission?.key
      || permission?.code
      || '-';
  }

  getPermissionCode(permission: any): string {
    return permission?.code
      || permission?.key
      || permission?.permissionCode
      || permission?.id
      || '-';
  }

  private buildPayload(): any {
    const raw = this.permissionForm.value;

    return {
      name: raw.name,
      module: raw.module,
      code: raw.code,
      description: raw.description
    };
  }

  private readNumber(value: any, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private filterPermissions(list: any[]): any[] {
    const term = this.searchText.trim().toLowerCase();

    if (!term) {
      return list;
    }

    return list.filter(permission => [
      this.getPermissionName(permission),
      this.getPermissionCode(permission),
      permission?.module,
      permission?.description
    ].some(value => String(value || '').toLowerCase().includes(term)));
  }

  private slicePage(list: any[]): any[] {
    const start = this.pageIndex * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }
}
