import { Injectable } from '@angular/core';

export type PermissionAction = 'READ' | 'CREATE' | 'MODIFY' | 'UPDATE' | 'DELETE' | 'ALL';

export interface AccessMenuItem {
  id: string;
  label: string;
  subtitle?: string;
  icon: string;
  route?: string;
  accent?: 'blue' | 'orange' | 'green' | 'pink';
  permissions?: string[];
  comingSoon?: boolean;
}

export interface AccessMenuSection {
  id: string;
  label: string;
  icon: string;
  items: AccessMenuItem[];
}

@Injectable({
  providedIn: 'root'
})
export class AccessMenuService {
  private readonly sections: AccessMenuSection[] = [
    {
      id: 'main',
      label: 'Main',
      icon: 'dashboard',
      items: [
        { id: 'dashboard', label: 'Dashboard', subtitle: 'Role based workspace', icon: 'dashboard', route: '/dashboard', accent: 'blue' },
        { id: 'customers', label: 'Customers', subtitle: 'Create and manage CRM entries', icon: 'groups', route: '/customers', accent: 'blue', permissions: ['CUSTOMER', 'CUSTOMER_READ', 'CUSTOMER_VIEW', 'MANAGE_CUSTOMER'] },
        { id: 'vehicles', label: 'Vehicles', subtitle: 'Fleet tracking', icon: 'local_shipping', route: '/vehicle', accent: 'orange', permissions: ['VEHICLE', 'VEHICLE_READ', 'VEHICLE_VIEW', 'MANAGE_VEHICLE'] },
        { id: 'staff', label: 'Staff', subtitle: 'Staff profiles and access', icon: 'badge', route: '/staffdetails', accent: 'green', permissions: ['STAFF', 'STAFF_READ', 'STAFF_VIEW', 'MANAGE_STAFF'] },
        { id: 'company', label: 'Company', subtitle: 'Company profile and setup', icon: 'corporate_fare', route: '/company-list', accent: 'blue', permissions: ['COMPANY', 'COMPANY_READ', 'COMPANY_VIEW', 'MANAGE_COMPANY'] },
        { id: 'plans', label: 'Plans', subtitle: 'Subscription plans', icon: 'category', route: '/plan', accent: 'pink', permissions: ['PLAN', 'PLAN_VIEW', 'MANAGE_PLAN'] },
        { id: 'reports', label: 'Reports', subtitle: 'Business reports', icon: 'bar_chart', accent: 'green', comingSoon: true, permissions: ['REPORT', 'REPORT_VIEW', 'VIEW_REPORTS'] }
      ]
    },
    {
      id: 'operation',
      label: 'Operation',
      icon: 'workspaces',
      items: [
        { id: 'quotation', label: 'quotation', subtitle: 'Manage system quotation', icon: 'request_quote', route: '/quotations', accent: 'orange', permissions: ['QUOTATION', 'QUOTATION_VIEW', 'QUOTATION_CREATE', 'MANAGE_QUOTATION'] },
        { id: 'trips', label: 'Trips', subtitle: 'Manage trip lifecycle', icon: 'route', route: '/trips', accent: 'blue', permissions: ['TRIP', 'TRIP_VIEW', 'TRIP_CREATE', 'MANAGE_TRIP'] },
        { id: 'billing', label: 'Billing', subtitle: 'Invoices, GST and receipts', icon: 'receipt_long', accent: 'green', comingSoon: true, permissions: ['BILLING', 'BILLING_VIEW', 'INVOICE', 'MANAGE_BILLING'] }
      ]
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'settings',
      items: [
        { id: 'roles', label: 'Roles', subtitle: 'Create and update role access', icon: 'admin_panel_settings', route: '/roles', accent: 'blue', permissions: ['ROLE', 'ROLE_VIEW', 'ROLE_CREATE', 'MANAGE_ROLE'] },
        { id: 'permission', label: 'Permission', subtitle: 'Review permission mapping', icon: 'vpn_key', route: '/permission-list', accent: 'pink', permissions: ['PERMISSION', 'PERMISSION_VIEW', 'MANAGE_PERMISSION'] },
        { id: 'department', label: 'Department', subtitle: 'Maintain department master', icon: 'domain', route: '/department', accent: 'green', permissions: ['DEPARTMENT', 'DEPARTMENT_VIEW', 'DEPARTMENT_CREATE', 'MANAGE_DEPARTMENT'] },
        { id: 'systemconfig', label: 'System Configuration', subtitle: 'Manage system settings', icon: 'settings', route: '/system-configuration', accent: 'blue', permissions: ['SYSTEMCONFIG', 'SYSTEMCONFIG_VIEW', 'SYSTEMCONFIG_CREATE', 'SYSTEMCONFIG_DEPARTMENT'] },
        { id: 'createplan', label: 'Plan Management', subtitle: 'Manage subscription plans', icon: 'payments', route: '/createplan', accent: 'pink', permissions: ['PLAN', 'PLAN_VIEW', 'MANAGE_PLAN'] }

      ]
    }
  ];

  getSections(): AccessMenuSection[] {
    return this.sections
      .map(section => ({
        ...section,
        items: section.items.filter(item => this.canAccess(item))
      }))
      .filter(section => section.items.length > 0);
  }

  getDashboardSections(): AccessMenuSection[] {
    return this.getSections().filter(section => section.id !== 'main');
  }

  getInternalRoutes(): string[] {
    return this.sections
      .flatMap(section => section.items)
      .map(item => item.route)
      .filter((route): route is string => !!route);
  }

  isSuperAdmin(): boolean {
    return this.getCurrentAccess().isSuperAdmin;
  }

  canAccess(item: AccessMenuItem): boolean {
    const access = this.getCurrentAccess();

    if (access.isSuperAdmin || !access.hasAccessData || !item.permissions?.length) {
      return true;
    }

    return item.permissions.some(permission => {
      const normalized = this.normalize(permission);
      return access.permissions.has(normalized) || access.permissions.has(this.normalize(item.id));
    });
  }

  hasPermission(module: string, action: PermissionAction = 'READ'): boolean {
    const access = this.getCurrentAccess();
    if (access.isSuperAdmin) {
      return true;
    }

    if (!access.hasAccessData) {
      return true; // Default fallback if no permissions populated yet
    }

    const mod = this.normalize(module);
    const act = action.toUpperCase();
    let searchAction = act;
    if (act === 'MODIFY') searchAction = 'UPDATE';

    const specificCode = `${mod}_${searchAction}`;
    const allCode = `${mod}_ALL`;
    const viewCode = `${mod}_VIEW`;
    const readCode = `${mod}_READ`;
    const updateDeleteCode = `${mod}_UPDATE_DELETE`;

    if (access.permissions.has(specificCode) || access.permissions.has(allCode)) {
      return true;
    }

    if (act === 'READ' && (access.permissions.has(viewCode) || access.permissions.has(readCode) || access.permissions.has(mod))) {
      return true;
    }

    if ((act === 'MODIFY' || act === 'UPDATE' || act === 'DELETE') && access.permissions.has(updateDeleteCode)) {
      return true;
    }

    return false;
  }

  private getCurrentAccess(): { permissions: Set<string>; isSuperAdmin: boolean; hasAccessData: boolean } {
    const session = this.readJson(localStorage.getItem('user_session'));
    const staffInfo = this.readJson(localStorage.getItem('staffInfo'));
    const user = this.readJson(localStorage.getItem('user'));
    const tokenPayload = this.readTokenPayload();
    const sources = [session, staffInfo?.data, staffInfo, user, tokenPayload].filter(Boolean);
    const permissions = new Set<string>();
    const roles = new Set<string>();

    sources.forEach(source => {
      this.addAccessValue(source?.permissions, permissions);
      this.addAccessValue(source?.permissionList, permissions);
      this.addAccessValue(source?.authorities, permissions);
      this.addAccessValue(source?.role, roles);
      this.addAccessValue(source?.roleName, roles);
      this.addAccessValue(source?.staffType, roles);

      if (Array.isArray(source?.roles)) {
        source.roles.forEach((role: any) => {
          this.addAccessValue(role?.roleName || role?.code || role?.name, roles);
          this.addAccessValue(role?.permissions, permissions);
        });
      }
    });

    const username = this.normalize(session?.userName || session?.firstName || tokenPayload?.sub || '');
    const isSuperAdmin = roles.has('SUPERADMIN') || roles.has('SUPER_ADMIN') || roles.has('ADMIN') || username.includes('SUPERADMIN');

    return { permissions, isSuperAdmin, hasAccessData: roles.size > 0 || permissions.size > 0 };
  }

  private addAccessValue(value: any, target: Set<string>): void {
    if (!value) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(item => this.addAccessValue(item, target));
      return;
    }

    if (typeof value === 'object') {
      ['key', 'code', 'name', 'label', 'permissionName', 'roleName'].forEach(key => {
        this.addAccessValue(value[key], target);
      });
      return;
    }

    String(value)
      .split(',')
      .map(item => this.normalize(item))
      .filter(Boolean)
      .forEach(item => target.add(item));
  }

  private normalize(value: string): string {
    return value.trim().replace(/[\s-]+/g, '_').toUpperCase();
  }

  private readJson(value: string | null): any {
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private readTokenPayload(): any {
    const token = localStorage.getItem('token');
    if (!token) {
      return null;
    }

    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }
}
