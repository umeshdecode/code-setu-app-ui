import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
  HttpClient
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  private isRefreshing = false;

  constructor(private http: HttpClient, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('token');
    const isAuthRequest =
      req.url.includes('/login') ||
      req.url.includes('/generate-token') ||
      req.url.includes('/otp') ||
      req.url.includes('/public');

    if (token && !isAuthRequest) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 403 && !req.url.includes('/auth/refresh')) {
          return this.handle403Error(req, next);
        }
        return throwError(() => error);
      })
    );
  }

  private handle403Error(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.isRefreshing) {
      return throwError(() => new Error('Token refresh already in progress'));
    }

    this.isRefreshing = true;

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post('/api/auth/refresh', { token: refreshToken }).pipe(
      switchMap((res: any) => {
        this.isRefreshing = false;

        const newToken = res.accessToken || res.token || res.data?.accessToken;
        if (newToken) {
          localStorage.setItem('token', newToken);

          const cloned = req.clone({
            setHeaders: {
              Authorization: `Bearer ${newToken}`
            }
          });

          return next.handle(cloned);
        }

        this.logout();
        return throwError(() => new Error('Invalid refresh response'));
      }),
      catchError((err) => {
        this.isRefreshing = false;
        this.logout();
        return throwError(() => err);
      })
    );
  }

  private logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user_session');
    localStorage.removeItem('staffInfo');
    localStorage.removeItem('user');
    this.router.navigateByUrl('/login');
  }
}
