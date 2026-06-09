import { HttpClient } from '@angular/common/http';
import { Token } from '@angular/compiler';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { JwttokenService } from './jwttoken.service';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import { StaffuserServiceService } from './staffuser-service';
import { tap } from 'rxjs/operators'; // Required to use tap in .pipe()
import { ENV } from 'src/assets/env';
import { AuthResponse } from '../models/authresponse';
import { GenericDataDTO } from '../models/generic-data-dto';
import { Router } from '@angular/router';

// import { url } from 'inspector';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  signupLogin(email: any, password: any) {
    throw new Error('Method not implemented.');
  }


  private loggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
  loggedIn$ = this.loggedInSubject.asObservable();

  private BASE_URL = ENV.CARGO_SETU;
  constructor(private http: HttpClient,
    private jwtdecode: JwttokenService,
    private staffuserservice: StaffuserServiceService,
    private router: Router,
  ) { }

  private hasToken(): boolean {
    return !!localStorage.getItem('token');
  }

  generateToken(creadential: any) {
    return this.http.post<AuthResponse>(`${this.BASE_URL}/auth/login`, creadential);
  }

  // loginUser(token: string) {
  //   if (!token) return false;

  //   localStorage.setItem('token', token);
  //   this.loggedInSubject.next(true);   

  //   return true;
  // }



  loginUser(token: string): boolean {
    if (!token) return false;

    // Clear old details immediately to prevent showing stale details
    localStorage.removeItem('user_session');
    localStorage.removeItem('staffInfo');
    localStorage.removeItem('user');

    try {
      localStorage.setItem('token', token);

      const decoded: JwtPayload = jwtDecode<JwtPayload>(token);
      console.log('Decoded Token:', decoded);

      // Check if exp exists first
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        try {
          // Attempt to get a new access token using your refresh token
          const newTokens =  this.refreshToken();

          // Update your local storage/state with the new token
          this.updateTokens(newTokens);
          return true;
        } catch (error) {
          // If refresh fails (e.g., refresh token also expired), then logout
          this.logout();
          return false;
        }
      }
      if (token) {
        const decoded = this.jwtdecode.getDecodedToken(); // Ensure variable name match (jwtdecode)
        if (decoded && decoded.sub) {
          tap((staffData: any) => {
            this.loggedInSubject.next(true);
            localStorage.setItem('staffInfo', JSON.stringify(staffData));
            console.log("loging staff" + this.currentUserSubject.value);
          })
          this.staffuserservice.getStaffById(decoded.sub).subscribe({
            next: (res: GenericDataDTO) => {
              if (res.responseCode === 200 && res.data) {
                const staffData = res.data;
                // Save as one object
                const userSession = {
                  staffId: res.data.staffId,
                  uuid: res.data.uuid,
                  userName: res.data.userName,
                  firstName: res.data.firstName,
                  roles: res.data.roles || [],
                  permissions: this.extractPermissions(res.data)
                };
                localStorage.setItem('user_session', JSON.stringify(userSession));

              }
            },
            error: (err) => console.error('Error fetching staff details', err)
          });
        }
      }

      this.loggedInSubject.next(true);
      return true;

    } catch (error) {
      console.error('Invalid JWT Token', error);
      return false;
    }
  }
  updateTokens(newTokens: any) {
    this.loginAndFetchUser
  }
  refreshToken(): Observable<any> {
    const refreshToken = localStorage.getItem('refreshToken');
    return this.http.post('/api/auth/refresh', { token: refreshToken });
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user_session');
    localStorage.removeItem('staffInfo');
    localStorage.removeItem('user');
    this.loggedInSubject.next(false);
    this.router.navigateByUrl("/login");
  }

  isLoggedIn() {
    return this.hasToken();
  }

  loginAndFetchUser(token: string): Observable<any> {
    // Clear old details immediately to prevent showing stale details
    localStorage.removeItem('user_session');
    localStorage.removeItem('staffInfo');
    localStorage.removeItem('user');

    localStorage.setItem('token', token);
    const decoded: any = jwtDecode(token);

    if (decoded && decoded.sub) {
      return this.staffuserservice.getStaffById(decoded.sub).pipe(
        tap((res: any) => {
          const data = res?.data || res;
          if (data) {
            localStorage.setItem('staffInfo', JSON.stringify(res));
            const userSession = {
              staffId: data.staffId,
              uuid: data.uuid,
              userName: data.userName,
              firstName: data.firstName,
              roles: data.roles || [],
              permissions: this.extractPermissions(data)
            };
            localStorage.setItem('user_session', JSON.stringify(userSession));
          }
          this.loggedInSubject.next(true);
        })
      );
    }
    // Use return throwError for error handling in RxJS
    return throwError(() => new Error('Invalid Token Payload'));
  }



  private currentUserSubject = new BehaviorSubject<any>(JSON.parse(localStorage.getItem('user') || '{}'));
  public currentUser$ = this.currentUserSubject.asObservable();

  // Method to update user data after a successful login
  setUserData(user: any) {
    localStorage.setItem('user', JSON.stringify(user)); // Save for persistence
    this.currentUserSubject.next(user); // Notify all subscribers
  }

  // Helper to get data once without subscribing
  getUserData() {
    return this.currentUserSubject.value;
  }

  private extractPermissions(staffData: any): any[] {
    const directPermissions = staffData?.permissions || staffData?.permissionList || [];
    const rolePermissions = Array.isArray(staffData?.roles)
      ? staffData.roles.flatMap((role: any) => role?.permissions || [])
      : [];

    return [...directPermissions, ...rolePermissions];
  }

}
