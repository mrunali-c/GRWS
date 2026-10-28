import { HttpInterceptorFn } from "@angular/common/http";

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  if (typeof localStorage === "undefined") return next(request);
  const token = localStorage.getItem("stylist_access_token");
  if (!token) return next(request);
  return next(request.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  }));
};
