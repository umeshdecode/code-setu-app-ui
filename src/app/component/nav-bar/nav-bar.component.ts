import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterModule } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { GenericDataDTO } from 'src/app/models/generic-data-dto';
import { JwttokenService } from 'src/app/services/jwttoken.service';
import { LoginService } from 'src/app/services/login.service';
import { StaffuserServiceService } from 'src/app/services/staffuser-service';

@Component({
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.css']
})
export class NavBarComponent implements OnInit {
  staffForm!: FormGroup;

  constructor(private loginservice: LoginService,
    private staffuserservice: StaffuserServiceService,
    private router: Router,
    private jwtdecode: JwttokenService,
    private fb: FormBuilder
  ) { }
  loggedIn: boolean = false;
  userId: string = '';
  username: string = '';
  displayName: string = '';
  staffData: any = null;
  userRolesDisplay: string = '';
  statusDisplay: string = '';
  sessionData = localStorage.getItem('user_session');
  userdata: any = null;


  public mobileMenuOpen = false;
  public servicesSubmenuOpen = false;


ngOnInit(): void {
  this.loginservice.loggedIn$.subscribe(status => {
    this.userdata = this.parseJson(localStorage.getItem('user_session'));
    this.loggedIn = status;

    if (status && this.userdata) {
      this.username = this.userdata.userName || this.userdata.firstName || '';
      const first = this.userdata.firstName || '';
      const last = this.userdata.lastName || '';
      this.displayName = (first) ? `${first}`.trim() : this.username;
    } else {
      this.username = '';
      this.displayName = '';
    }
  });
}

  closeMobileMenu() {
    this.mobileMenuOpen = false;
    this.servicesSubmenuOpen = false;
  }

  toggleServicesSubmenu() {
    this.servicesSubmenuOpen = !this.servicesSubmenuOpen;
  }
  logoutUser() {
    this.loginservice.logout()
  }
  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    if (!this.mobileMenuOpen) {
      this.servicesSubmenuOpen = false;
    }
  }


  // Source Component (e.g., nav-bar.component.ts)

  goToProfile(): void {
    // 1. Fetch data
    console.log(this.userdata)
    this.staffuserservice.getStaffById(this.userdata.staffId).subscribe({
      next: (response: GenericDataDTO) => {
        if (response && response.data) {
          // 2. Set the data in the shared service
          this.staffuserservice.setStaffDetails(response);

          // 3. Navigate only AFTER data is successfully received and stored
          this.router.navigate(['/staffdetails']);
        }
      },
      error: (err) => {
        console.error("Error fetching staff profile:", err);
      }
    });

    // Remove the `this.router.navigate(['/staffdetails']);` from above the subscribe block
  }


  goToEditProfile(): void {
    const user = this.jwtdecode.getDecodedToken();

    this.staffuserservice.getStaffById(user?.sub).subscribe(res => {
      // Navigate and pass the staff object in the router state
      this.router.navigate(['/staffuser'], { state: { staffData: res.data } });
    });
  }


  goToSettings(): void {
    this.router.navigate(['/settings']);
  }

  goToSecurity(): void {
    this.router.navigate(['/security']);
  }

  goToPrivacy(): void {
    this.router.navigate(['/privacy']);
  }

  initializeForm() {
    this.staffForm = this.fb.group({
      userName: ['', [Validators.required, Validators.minLength(3)]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(6)]],
      mobileCode: ['+91'],
      mobileNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      country: ['India'],
      state: [''],
      city: [''],
      address: [''],
      pincode: [null, [Validators.pattern('^[0-9]{6}$')]],
      departmentId: [null],
      staffType: ['STAFF', Validators.required],
      isActive: [true],
      dob: [null]
    });
  }
  loadStaffData() {
    // Load existing staff data from service or route params
    // Example: Get from localStorage or API
    const savedData = localStorage.getItem('currentStaff');
    if (savedData) {
      const staffData = JSON.parse(savedData);
      this.staffForm.patchValue(staffData);
    }
  }
  parseJson(value: string | null) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}
}
