import { APP_INITIALIZER, Component, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

// Corrected Imports
import { MatButtonModule } from '@angular/material/button'; // Fixed 'Buttom' to 'Button'
import { MatToolbarModule } from '@angular/material/toolbar'; // Fixed 'Bar' to 'bar'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule ,FormGroup,FormsModule} from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatMenuModule } from '@angular/material/menu'; // 1. Import it
import { Router, Routes } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { ImageCropperModule } from 'ngx-image-cropper';
import { MatTooltipModule } from '@angular/material/tooltip';


import { LoginComponent } from './component/login/login.component';
import { HomeComponent } from './component/home/home.component';
import { NavBarComponent } from './component/nav-bar/nav-bar.component';
import { DashboardComponent } from './component/dashboard/dashboard.component';
import { SignupComponent } from './component/signup/signup.component';
import { ServicesComponent } from './component/services/services.component';
import { AboutComponent } from './component/about/about.component';
import { ContectUsComponent } from './component/contect-us/contect-us.component';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule } from '@angular/material/dialog';
import { DialogboxComponent } from './component/dialogbox/dialogbox.component';
import { MatStepperModule } from '@angular/material/stepper';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginatorModule } from '@angular/material/paginator';

import { MatAutocompleteModule } from '@angular/material/autocomplete';

import { MatCheckboxModule } from '@angular/material/checkbox';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { FooterComponent } from './component/footer/footer.component';
import { StaffuserComponent } from './component/staffuser/staffuser.component';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { UpdateroleComponent } from './component/updaterole/updaterole.component';
import { RolesDetailsComponent } from './roles-details/roles-details.component';
import { DepartmentComponent } from './component/component/department/department.component';
import { LoaderComponent } from './component/loader/loader.component';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { PlanscreenComponent } from './component/planscreen/planscreen.component';
import { DownloadscreenComponent } from './component/downloadscreen/downloadscreen.component';
import { FeaturescreenComponent } from './component/featurescreen/featurescreen.component';
import { StaffDetailsComponent } from './component/staff-details/staff-details.component';
import { ImageCropperComponent } from './component/image-cropper/image-cropper.component';
import { CreateplanComponent } from './component/createplan/createplan.component';
import { CustomerComponent } from './component/customer/customer.component';
import { CompanyComponent } from './component/company/company.component';
import { PermissionComponent } from './component/permission/permission.component';
import { VehicleManagementComponent } from './component/vehicle-management/vehicle-management.component';
import { GoogleMapsModule } from '@angular/google-maps';
import { DriverLocationComponent } from './component/driver-location/driver-location.component';
import { PaginationComponent } from './component/pagination/pagination.component';
import { SyetemconfigurationComponent } from './component/syetemconfiguration/syetemconfiguration.component';
import { QuotaionComponent } from './component/quotaion/quotaion.component';
import { ThemeCustomizerComponent } from './component/theme-customizer/theme-customizer.component';
import { ThemeService } from './services/theme.service';
import { ViewcomponentComponent } from './component/viewcomponent/viewcomponent.component';
import { TripComponent } from './component/trip/trip.component';

// import { DownloadscreenComponent } from './component/downloadscreen/downloadscreen.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    NavBarComponent,
    SignupComponent,
    ServicesComponent,
    FooterComponent,
    StaffuserComponent,
    UpdateroleComponent,
    RolesDetailsComponent,
    DepartmentComponent,
    StaffDetailsComponent,
    ImageCropperComponent,
    CreateplanComponent,
    CustomerComponent,
    CompanyComponent,
    PermissionComponent,
    SyetemconfigurationComponent,
    QuotaionComponent,
    ThemeCustomizerComponent,
    ViewcomponentComponent,
    TripComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatButtonModule,
    MatToolbarModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatCardModule,
    MatCheckboxModule,
    HttpClientModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
    CommonModule,
    MatTableModule,
    MatDialogModule,
    MatStepperModule,
    MatDatepickerModule,
    MatMenuModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatAutocompleteModule,
    MatSnackBarModule,
    MatDividerModule,
    MatTooltipModule,
    ImageCropperModule,
    GoogleMapsModule,
    // Standalone components
    HomeComponent,
    DashboardComponent,
    AboutComponent,
    ContectUsComponent,
    LoaderComponent,
    PlanscreenComponent,
    DownloadscreenComponent,
    FeaturescreenComponent,
    VehicleManagementComponent,
    DriverLocationComponent,
    PaginationComponent,
    DialogboxComponent,
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: (themeService: ThemeService) => () => themeService.initialize(),
      deps: [ThemeService],
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }

  ], bootstrap: [AppComponent]
})
export class AppModule { }
