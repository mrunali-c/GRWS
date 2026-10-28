import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, tap } from "rxjs";

import { AppConfig } from "../config";
import {
  OutfitAssignmentReadDTO,
  UserProfileCreateDTO,
  WardrobeItemReadDTO,
} from "../models/dtos";

export interface WeeklyPlannerSummary {
  week_start: string;
  outfits: OutfitAssignmentReadDTO[];
  planned_count: number;
  completed_count: number;
  missed_count: number;
}

export interface Recommendation {
  item_id: string;
  item_name: string;
  category: string;
  color_hex: string;
  harmony: number;
  weather: number;
  style_balance: number;
  composite: number;
  thumbnail_url: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: "bearer";
  username: string;
}

@Injectable({ providedIn: "root" })
export class ApiService {
  private readonly baseUrl = `${AppConfig.apiUrl}${AppConfig.apiPrefix}`;

  constructor(private readonly http: HttpClient) {}

  signUp(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/signup`, { username, password })
      .pipe(tap((response) => this.storeToken(response.access_token)));
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, { username, password })
      .pipe(tap((response) => this.storeToken(response.access_token)));
  }

  logout(): void {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("stylist_access_token");
    }
  }

  listWardrobe(): Observable<WardrobeItemReadDTO[]> {
    return this.http.get<WardrobeItemReadDTO[]>(`${this.baseUrl}/wardrobe`);
  }

  createWardrobeItem(form: FormData): Observable<WardrobeItemReadDTO> {
    return this.http.post<WardrobeItemReadDTO>(`${this.baseUrl}/wardrobe`, form);
  }

  deleteWardrobeItem(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/wardrobe/${encodeURIComponent(id)}`);
  }

  getProfile(): Observable<UserProfileCreateDTO> {
    return this.http.get<UserProfileCreateDTO>(`${this.baseUrl}/profile`);
  }

  saveProfile(profile: UserProfileCreateDTO): Observable<UserProfileCreateDTO> {
    return this.http.put<UserProfileCreateDTO>(`${this.baseUrl}/profile`, profile);
  }

  getWeek(weekStart: string): Observable<WeeklyPlannerSummary> {
    return this.http.get<WeeklyPlannerSummary>(
      `${this.baseUrl}/calendar/week/${encodeURIComponent(weekStart)}`,
    );
  }

  scheduleOutfit(payload: {
    date: string;
    attire_id: string;
    accessory_id?: string | null;
    footwear_id?: string | null;
  }): Observable<OutfitAssignmentReadDTO> {
    return this.http.post<OutfitAssignmentReadDTO>(
      `${this.baseUrl}/calendar/outfit`,
      payload,
    );
  }

  deleteOutfit(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/calendar/outfit/${encodeURIComponent(id)}`,
    );
  }

  recommendations(
    date: string,
    occasion: string,
  ): Observable<{ outfit_recommendations: Recommendation[]; summary: unknown }> {
    const params = new HttpParams().set("planned_occasion", occasion);
    return this.http.post<{ outfit_recommendations: Recommendation[]; summary: unknown }>(
      `${this.baseUrl}/recommendations/outfit/${encodeURIComponent(date)}`,
      {},
      { params },
    );
  }

  imageUrl(path: string | null | undefined): string {
    if (!path) return "";
    return path.startsWith("http") ? path : `${AppConfig.apiUrl}${path}`;
  }

  todayLocalDate(): string {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${today.getFullYear()}-${month}-${day}`;
  }

  private storeToken(token: string): void {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("stylist_access_token", token);
    }
  }
}
