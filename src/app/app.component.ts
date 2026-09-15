import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { LoginService } from './services/login.service';
import { StaffuserServiceService } from './services/staffuser-service';
import { GenericDataDTO } from './models/generic-data-dto';
import { AccessMenuItem, AccessMenuSection, AccessMenuService } from './services/access-menu.service';
import { PwaUpdateService } from './services/pwa-update.service';
import { CompanyService } from './services/company.service';
import { DialogboxComponent } from './component/dialogbox/dialogbox.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'cargo-set-ui';
  showScrollButton = false;
  isInternalApp = false;
  username = 'SUPERADMIN';
  showProfileMenu = false;
  menuSections: AccessMenuSection[] = [];
  expandedSections: { [key: string]: boolean } = {};
  companyLogo: string = '';
  companyName: string = '';

  
  // Sidebar state
  isSidebarCollapsed = false;
  isMobileView = false;

  private internalRoutes: string[] = [];
  private readonly publicHomeRoutes = ['/', '/home'];

  userdata: any;

  // "Buy a Plan" static-timer prompt — non-Super-Admin users with no plan selected yet
  // get nudged once, a fixed delay after login, from whatever screen they're on.
  private planTimerId: any = null;
  private currentCompanyId: number | null = null;
  private hasSelectedPlan = false;
  private planDialogShown = false;
  private readonly PLAN_PROMPT_DELAY_MS = 1 * 60 * 1000; // 10 minutes

  constructor(
    private router: Router,
    private loginService: LoginService,
    private staffuserservice: StaffuserServiceService,
    private accessMenuService: AccessMenuService,
    private pwaUpdateService: PwaUpdateService,
    private companyService: CompanyService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    // Load user data
    try {
      this.userdata = JSON.parse(localStorage.getItem('user_session') || '{}');
      if (this.userdata && (this.userdata.firstName || this.userdata.userName)) {
        this.username = this.userdata.firstName || this.userdata.userName;
      }
    } catch (error) {
      console.error('Error parsing user session:', error);
      this.userdata = {};
    }

    this.refreshAccessMenu();

    // Check viewport size
    this.checkViewport();

    this.loginService.loggedIn$.subscribe((isLoggedIn: boolean) => {
      this.setLayout(this.router.url);
      this.redirectLoggedInHome(this.router.url);
      if (isLoggedIn) {
        this.fetchCurrentCompany();
        this.armPlanPrompt();
      } else {
        this.disarmPlanPrompt();
      }
    });

    if (this.loginService.isLoggedIn()) {
      this.fetchCurrentCompany();
      this.armPlanPrompt();
    }

    // Listen to route changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.setLayout(event.urlAfterRedirects);
        this.redirectLoggedInHome(event.urlAfterRedirects);
        this.showProfileMenu = false; // Close profile menu on route change
        this.closeSidebarOnMobile(); // Close sidebar on mobile after navigation
        this.checkCompanyStatus(event.urlAfterRedirects);
      });

    this.companyService.companyStatus$.subscribe(() => {
      this.checkCompanyStatus(this.router.url);
    });

    document.addEventListener('click', this.blockFeatureClick, true);
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.blockFeatureClick, true);
    clearTimeout(this.planTimerId);
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    this.showScrollButton = window.pageYOffset > 300;
  }

  @HostListener('window:resize')
  onResize() {
    this.checkViewport();
  }

  // Close profile menu when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const profileMenuWrap = document.querySelector('.profile-menu-wrap');
    
    if (profileMenuWrap && !profileMenuWrap.contains(target)) {
      this.showProfileMenu = false;
    }
  }

  // Check if viewport is mobile
  checkViewport() {
    const wasMobile = this.isMobileView;
    this.isMobileView = window.innerWidth <= 900;
    
    // Auto-adjust sidebar state based on viewport change
    if (this.isMobileView !== wasMobile) {
      if (this.isMobileView) {
        this.isSidebarCollapsed = true; // Hide on mobile by default
      } else {
        this.isSidebarCollapsed = false; // Show on desktop by default
      }
    }
  }

  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  navigate(path: string): void {
    if (path === 'quotations' || path === 'billing' || path === 'vehicles' || path === 'reports' || path === 'settings') {
      alert(`${path} module is currently under construction.`);
      return;
    }

    this.router.navigate([`/${path}`]);
    this.closeSidebarOnMobile();
  }

  toggleMenuSection(section: AccessMenuSection): void {
    if (section.id === 'main') {
      return;
    }

    this.expandedSections[section.id] = !this.expandedSections[section.id];
  }

  isMenuSectionOpen(section: AccessMenuSection): boolean {
    return section.id === 'main' || !!this.expandedSections[section.id];
  }

  handleMenuClick(item: AccessMenuItem): void {
    if (item.comingSoon || !item.route) {
      alert(`${item.label} module is currently under construction.`);
      this.closeSidebarOnMobile();
      return;
    }

    this.router.navigate([item.route]);
    this.closeSidebarOnMobile();
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  closeSidebar() {
    if (this.isMobileView) {
      this.isSidebarCollapsed = true;
    }
  }

  closeSidebarOnMobile() {
    if (this.isMobileView) {
      this.isSidebarCollapsed = true;
    }
  }

  toggleProfileMenu(): void {
    this.showProfileMenu = !this.showProfileMenu;
  }

  closeProfileMenu(): void {
    this.showProfileMenu = false;
  }

  logout(): void {
    this.companyService.clearCompanyStatus();
    this.loginService.logout();
    this.closeProfileMenu();
  }

  goToStaffDetails(): void {
    console.log(this.userdata);
    
    if (!this.userdata || !this.userdata.staffId) {
      console.error('No staff ID found in user session');
      this.closeProfileMenu();
      return;
    }

    this.staffuserservice.getStaffById(this.userdata.staffId).subscribe({
      next: (response: GenericDataDTO) => {
        if (response && response.data) {
          // Set the data in the shared service
          this.staffuserservice.setStaffDetails(response);

          // Navigate to staff details
          this.router.navigate(['/staffdetails']);
          this.closeProfileMenu();
          this.closeSidebarOnMobile();
        }
      },
      error: (err) => {
        console.error("Error fetching staff profile:", err);
        this.closeProfileMenu();
      }
    });
  }

  goToEditProfile(): void {
    this.closeProfileMenu();
    this.router.navigate(['/staffuser']);
    this.closeSidebarOnMobile();
  }

  private checkCompanyStatus(url: string): void {
    if (!this.loginService.isLoggedIn()) return;

    const path = this.getPath(url);
    const skipRoutes = ['/company-create', '/company-edit', '/company-list', '/login', '/signup'];
    if (skipRoutes.some(r => path.startsWith(r))) return;

    if (this.companyService.getCompanyStatus() === false) {
      setTimeout(() => this.companyService.promptCreateCompany(), 200);
    }
  }

  // App-wide guard: while a logged-in user has no company, block any feature
  // usage (clicks in content areas) so nothing can be created/edited/deleted.
  private blockFeatureClick = (event: MouseEvent): void => {
    if (!this.loginService.isLoggedIn()) return;
    if (this.companyService.getCompanyStatus() !== false) return;

    const path = this.getPath(this.router.url);
    const skipRoutes = ['/company-create', '/company-edit', '/company-list', '/login', '/signup'];
    if (skipRoutes.some(r => path.startsWith(r))) return;

    const target = event.target as Element | null;
    if (!target || typeof target.closest !== 'function') return;

    // Allow overlay dialogs (the Create Company popup itself), the sidebar
    // (module navigation, profile + logout), the header and public chrome.
    if (target.closest('.cdk-overlay-container')) return;
    if (target.closest('.admin-sidebar') || target.closest('.sidebar-overlay')) return;
    if (target.closest('.admin-topbar')) return;
    if (target.closest('app-nav-bar') || target.closest('app-footer')) return;

    // Block the rest (content area actions) and re-prompt.
    event.preventDefault();
    event.stopImmediatePropagation();
    this.companyService.promptCreateCompany();
  }

  private setLayout(url: string): void {
    const path = this.getPath(url);

    this.refreshAccessMenu();
    this.isInternalApp = this.loginService.isLoggedIn() && 
                         this.internalRoutes.some(route => path.startsWith(route));

    const session = localStorage.getItem('user_session');
    if (session) {
      try {
        const user = JSON.parse(session);
        this.username = user.firstName || user.userName || this.username;
      } catch (error) {
        console.error('Error parsing user session in setLayout:', error);
      }
    }
  }

  private redirectLoggedInHome(url: string): void {
    if (this.loginService.isLoggedIn() && this.publicHomeRoutes.includes(this.getPath(url))) {
      this.router.navigateByUrl('/dashboard');
    }
  }

  private getPath(url: string): string {
    const path = url.split('?')[0].split('#')[0] || '/';
    return path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
  }

  private refreshAccessMenu(): void {
    this.menuSections = this.accessMenuService.getSections();
    this.internalRoutes = Array.from(new Set([
      ...this.accessMenuService.getInternalRoutes(),
      '/staffuser',
      '/createrole',
      '/updaterole',
      '/createplan',
      '/company-create',
      '/company-edit'
    ]));

    this.menuSections.forEach(section => {
      if (section.id !== 'main' && this.expandedSections[section.id] === undefined) {
        this.expandedSections[section.id] = true;
      }
    });
  }

  private fetchCurrentCompany(): void {
    this.companyService.getCurrentCompany().subscribe({
      next: (res: any) => {
        if (res?.data) {
          if (res.data.assets && Array.isArray(res.data.assets)) {
            const logoAsset = res.data.assets.find((a: any) => a.assetType === 'LOGO');
            if (logoAsset && logoAsset.fileUrl) {
              this.companyLogo = logoAsset.fileUrl;
            } else if (res.data.logoBase64) {
              this.companyLogo = res.data.logoBase64;
            }
          } else if (res.data.logoBase64) {
            this.companyLogo = res.data.logoBase64;
          }
          if (res.data.companyName) {
            this.companyName = res.data.companyName;
          }
          this.currentCompanyId = res.data.companyId ?? null;
          this.hasSelectedPlan = res.data.selectedPlanId != null;
        }
      },
      error: (err: any) => console.warn('Failed to fetch company details', err)
    });
  }

  /** Starts (or restarts) the fixed-delay "Buy a Plan" nudge for the current login. */
  private armPlanPrompt(): void {
    clearTimeout(this.planTimerId);
    this.planTimerId = setTimeout(() => this.maybeShowPlanPrompt(), this.PLAN_PROMPT_DELAY_MS);
  }

  /** Cancels the pending nudge and resets the shown-flag so a fresh login gets a fresh chance. */
  private disarmPlanPrompt(): void {
    clearTimeout(this.planTimerId);
    this.planDialogShown = false;
  }

  private maybeShowPlanPrompt(): void {
    if (
      this.planDialogShown ||
      !this.loginService.isLoggedIn() ||
      this.accessMenuService.isSuperAdmin() ||
      this.hasSelectedPlan ||
      this.getPath(this.router.url) === '/select-plan'
    ) {
      return;
    }

    this.planDialogShown = true;
    const dialogRef = this.dialog.open(DialogboxComponent, {
      width: '450px',
      disableClose: false,
      data: {
        title: 'Choose a Plan',
        message: 'Pick a subscription plan to keep using all features.',
        confirmText: 'Buy a Plan',
        cancelText: 'Maybe Later'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.router.navigate(['/select-plan'], { queryParams: { companyId: this.currentCompanyId } });
      }
    });
  }
}
