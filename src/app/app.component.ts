import { Component, HostListener, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LoginService } from './services/login.service';
import { StaffuserServiceService } from './services/staffuser-service';
import { GenericDataDTO } from './models/generic-data-dto';
import { AccessMenuItem, AccessMenuSection, AccessMenuService } from './services/access-menu.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'cargo-set-ui';
  showScrollButton = false;
  isInternalApp = false;
  username = 'SUPERADMIN';
  showProfileMenu = false;
  menuSections: AccessMenuSection[] = [];
  expandedSections: { [key: string]: boolean } = {};
  
  // Sidebar state
  isSidebarCollapsed = false;
  isMobileView = false;

  private internalRoutes: string[] = [];
  private readonly publicHomeRoutes = ['/', '/home'];

  userdata: any;

  constructor(
    private router: Router,
    private loginService: LoginService,
    private staffuserservice: StaffuserServiceService,
    private accessMenuService: AccessMenuService,
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

    this.loginService.loggedIn$.subscribe(() => {
      this.setLayout(this.router.url);
      this.redirectLoggedInHome(this.router.url);
    });

    // Listen to route changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.setLayout(event.urlAfterRedirects);
        this.redirectLoggedInHome(event.urlAfterRedirects);
        this.showProfileMenu = false; // Close profile menu on route change
        this.closeSidebarOnMobile(); // Close sidebar on mobile after navigation
      });
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
}
