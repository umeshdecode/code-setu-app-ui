import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './component/home/home.component';
import { LoginComponent } from './component/login/login.component';
import { DashboardComponent } from './component/dashboard/dashboard.component';
import { SignupComponent } from './component/signup/signup.component';
import { ServicesComponent } from './component/services/services.component';
import { AboutComponent } from './component/about/about.component';
import { ContectUsComponent } from './component/contect-us/contect-us.component';
import { AuthGuard } from './services/guard/auth.guard';
import { FooterComponent } from './component/footer/footer.component';
import { RoleComponent } from './component/component/role/role.component';
import { UpdateroleComponent } from './component/updaterole/updaterole.component';
import { RolesDetailsComponent } from './roles-details/roles-details.component';
import { DepartmentComponent } from './component/component/department/department.component';
import { PlanscreenComponent } from './component/planscreen/planscreen.component';
import { FeaturescreenComponent } from './component/featurescreen/featurescreen.component';
import { StaffDetailsComponent } from './component/staff-details/staff-details.component';
import { StaffuserComponent } from './component/staffuser/staffuser.component';
import { CreateplanComponent } from './component/createplan/createplan.component';
import { CustomerComponent } from './component/customer/customer.component';
import { CompanyComponent } from './component/company/company.component';
import { PermissionComponent } from './component/permission/permission.component';
import { VehicleManagementComponent } from './component/vehicle-management/vehicle-management.component';
import { VehicleComponent } from './component/vehicle/vehicle.component';
import { DriverComponent } from './component/driver/driver.component';
import { AssignmentComponent } from './component/assignment/assignment.component';
import { SyetemconfigurationComponent } from './component/syetemconfiguration/syetemconfiguration.component';
import { QuotaionComponent } from './component/quotaion/quotaion.component';
import { TripComponent } from './component/trip/trip.component';

const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: 'login', component: LoginComponent, pathMatch: "full" },
  { path: 'dashboard', component: DashboardComponent, pathMatch: 'full', canActivate: [AuthGuard] },
  { path: 'signup', component: SignupComponent, pathMatch: 'full' },
  { path: 'services', component: ServicesComponent, pathMatch: 'full' },
  { path: 'about', component: AboutComponent, pathMatch: 'full' },
  { path: 'contactus', component: ContectUsComponent, pathMatch: 'full' },
  { path: 'home', component: HomeComponent, pathMatch: 'full' },
  { path: 'createrole', component: RoleComponent, pathMatch: 'full' },
  { path: 'updaterole', component: UpdateroleComponent, pathMatch: 'full' },
  { path: 'roles', component: RolesDetailsComponent, pathMatch: 'full' },
  { path: 'permission-list', component: PermissionComponent, pathMatch: 'full', canActivate: [AuthGuard] },
  { path: 'feature', component: FeaturescreenComponent, pathMatch: 'full' },
  { path: 'staffdetails', component: StaffDetailsComponent, pathMatch: 'full', canActivate: [AuthGuard] },
  { path: 'staffuser', component: StaffuserComponent, pathMatch: 'full', canActivate: [AuthGuard] },

  { path: 'department', component: DepartmentComponent, pathMatch: 'full', canActivate: [AuthGuard] },
  { path: 'plan', component: PlanscreenComponent, pathMatch: 'full', canActivate: [AuthGuard] },
  { path: 'createPlan', redirectTo: 'createplan', pathMatch: 'full' },
  { path: 'createPLan', redirectTo: 'createplan', pathMatch: 'full' },
  { path: 'createplan', component: CreateplanComponent, pathMatch: 'full', canActivate: [AuthGuard] },
  { path: 'customers', component: CustomerComponent, pathMatch: 'full', canActivate: [AuthGuard] },
  { path: 'staffuser/:staffId', component: StaffuserComponent, pathMatch: 'full', canActivate: [AuthGuard] },
  { path: 'company-list', component: CompanyComponent , pathMatch: 'full', canActivate: [AuthGuard] },
{ path: 'company-create', component: CompanyComponent,  pathMatch: 'full', canActivate: [AuthGuard] },
{ path: 'company-edit/:id', component: CompanyComponent,  pathMatch: 'full', canActivate: [AuthGuard] },
{ path: 'vehicle', redirectTo: 'vehicle-management', pathMatch: 'full' },
{ path: 'vehicle-management', component: VehicleManagementComponent, pathMatch: 'full', canActivate: [AuthGuard] },
{ path: 'vehicle-management/vehicles', component: VehicleComponent, pathMatch: 'full', canActivate: [AuthGuard] },
{ path: 'vehicle-management/drivers', component: DriverComponent, pathMatch: 'full', canActivate: [AuthGuard] },
{ path: 'vehicle-management/assignments', component: AssignmentComponent, pathMatch: 'full', canActivate: [AuthGuard] },
{ path: 'system-configuration', component: SyetemconfigurationComponent, pathMatch: 'full', canActivate: [AuthGuard] },
{ path: 'quotations', component: QuotaionComponent, pathMatch: 'full', canActivate: [AuthGuard] },
{ path: 'trips', component: TripComponent, pathMatch: 'full', canActivate: [AuthGuard] },

];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      // This enables jumping to the #id in the URL
      anchorScrolling: 'enabled',
      // This ensures the page starts at the top when changing routes
      scrollPositionRestoration: 'enabled',
      // Optional: adds a smooth scroll effect
      scrollOffset: [0, 64]
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
