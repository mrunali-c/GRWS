import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { CardModule } from "primeng/card";
import { KnobModule } from "primeng/knob";
import { ApiService } from "../../core/services/api.service";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, CardModule, KnobModule],
  template: `
    <div class="dashboard-shell min-h-screen">
      <header class="dashboard-header">
        <div class="header-content">
          <a class="brand" routerLink="/dashboard" aria-label="AI Personal Stylist home">
            <span class="brand-mark"><i class="pi pi-sparkles"></i></span>
            <span>AI Personal Stylist</span>
          </a>

          <nav class="main-nav" aria-label="Main navigation">
            <a routerLink="/wardrobe" routerLinkActive="active" class="nav-link">
              <i class="pi pi-box"></i><span>Wardrobe</span>
            </a>
            <a routerLink="/planner" routerLinkActive="active" class="nav-link">
              <i class="pi pi-calendar"></i><span>Planner</span>
            </a>
            <a routerLink="/stylist" routerLinkActive="active" class="nav-link">
              <i class="pi pi-sliders-h"></i><span>Stylist</span>
            </a>
            <a routerLink="/profile" routerLinkActive="active" class="nav-link">
              <i class="pi pi-user"></i><span>Profile</span>
            </a>
            <a routerLink="/auth" routerLinkActive="active" class="nav-link">
              <i class="pi pi-sign-in"></i><span>Account</span>
            </a>
          </nav>
        </div>
      </header>

      <main class="dashboard-content">
        <section class="welcome-panel">
          <div>
            <p class="eyebrow">YOUR PERSONAL STYLE, IN ONE PLACE</p>
            <h1>Get dressed with confidence.</h1>
            <p class="welcome-copy">
              Keep your wardrobe organized, plan the week, and find outfits that feel like you.
            </p>
          </div>
          <div class="welcome-art" aria-hidden="true">
            <i class="pi pi-sparkles"></i>
          </div>
        </section>
        @if (error) {
          <p role="alert" class="mt-4 text-red-700">{{ error }}</p>
        }

        <section class="dashboard-grid" aria-label="Your style dashboard">
          <p-card class="dashboard-card wardrobe-card">
            <div class="card-heading">
              <span class="card-icon"><i class="pi pi-box"></i></span>
              <div>
                <h2>Wardrobe</h2>
                <p>Your digital closet inventory</p>
              </div>
            </div>
            <div class="category-list" aria-label="Wardrobe categories">
              <span *ngFor="let category of categories" class="category-pill">
                {{ category }}
              </span>
              <span *ngIf="categories.length === 0" class="category-pill">No items yet</span>
            </div>
            <a routerLink="/wardrobe" class="card-link">
              Explore your wardrobe <i class="pi pi-arrow-right"></i>
            </a>
          </p-card>

          <p-card class="dashboard-card planner-card">
            <div class="card-heading">
              <span class="card-icon"><i class="pi pi-calendar"></i></span>
              <div>
                <h2>Weekly Planner</h2>
                <p>Plan outfits for the week ahead</p>
              </div>
            </div>
            <div class="day-list" aria-label="Days of the week">
              <span
                *ngFor="let day of days"
                class="day-pill"
                [class.today]="day === today"
                [attr.aria-current]="day === today ? 'date' : null"
              >
                {{ day }}
              </span>
            </div>
            <a routerLink="/planner" class="card-link">
              Open your planner <i class="pi pi-arrow-right"></i>
            </a>
          </p-card>

          <p-card class="dashboard-card stylist-card">
            <div class="card-heading">
              <span class="card-icon"><i class="pi pi-sparkles"></i></span>
              <div>
                <h2>AI Stylist</h2>
                <p>Weather-aware outfit recommendations</p>
              </div>
            </div>
            <div class="score-list">
              <div class="score-item" *ngFor="let score of scores">
                <p-knob
                  [(ngModel)]="score.value"
                  [size]="86"
                  [strokeWidth]="8"
                  [valueColor]="score.color"
                  rangeColor="#eeeaf2"
                  textColor="#352d3a"
                  [readonly]="true"
                />
                <span>{{ score.label }}</span>
              </div>
            </div>
            <a routerLink="/stylist" class="card-link">
              Get outfit ideas <i class="pi pi-arrow-right"></i>
            </a>
          </p-card>
        </section>
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        color: #292333;
      }

      .dashboard-shell {
        background: #f8f6f9;
      }

      .dashboard-header {
        background: #fff;
        border-bottom: 1px solid #ece8ef;
      }

      .header-content {
        width: min(1180px, calc(100% - 48px));
        min-height: 76px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 11px;
        color: #292333;
        font-size: 16px;
        font-weight: 750;
        text-decoration: none;
        white-space: nowrap;
      }

      .brand-mark,
      .card-icon {
        display: grid;
        place-items: center;
        flex: 0 0 auto;
      }

      .brand-mark {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        background: #f0e8f5;
        color: #76518d;
        font-size: 18px;
      }

      .main-nav {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .nav-link {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 13px;
        border-radius: 10px;
        color: #665f6d;
        font-size: 14px;
        font-weight: 600;
        text-decoration: none;
      }

      .nav-link:hover,
      .nav-link.active {
        background: #f2edf5;
        color: #68477e;
      }

      .dashboard-content {
        width: min(1180px, calc(100% - 48px));
        margin: 0 auto;
        padding: 42px 0 64px;
      }

      .welcome-panel {
        min-height: 190px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        padding: 32px 40px;
        border: 1px solid #eee6f1;
        border-radius: 20px;
        background: linear-gradient(112deg, #fff 12%, #f1eaf5 100%);
        box-shadow: 0 8px 24px rgb(54 37 64 / 5%);
      }

      .eyebrow {
        margin: 0 0 10px;
        color: #805b92;
        font-size: 11px;
        font-weight: 750;
        letter-spacing: 0.12em;
      }

      .welcome-panel h1 {
        margin: 0;
        color: #30263a;
        font-size: clamp(25px, 3vw, 34px);
        font-weight: 750;
        letter-spacing: -0.035em;
      }

      .welcome-copy {
        max-width: 560px;
        margin: 10px 0 0;
        color: #706978;
        font-size: 15px;
        line-height: 1.6;
      }

      .welcome-art {
        display: grid;
        place-items: center;
        width: 108px;
        height: 108px;
        flex: 0 0 auto;
        border: 1px solid rgb(255 255 255 / 70%);
        border-radius: 32px;
        background: linear-gradient(145deg, #e6d7ee, #f8e9df);
        color: #79548f;
        font-size: 40px;
        transform: rotate(5deg);
      }

      .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        align-items: stretch;
        gap: 20px;
        margin-top: 26px;
      }

      .dashboard-card {
        min-width: 0;
      }

      .card-heading {
        display: flex;
        align-items: center;
        gap: 13px;
      }

      .card-icon {
        width: 42px;
        height: 42px;
        border-radius: 13px;
        background: #f1e9f5;
        color: #76518d;
        font-size: 17px;
      }

      .planner-card .card-icon {
        background: #eaf0fb;
        color: #5272a9;
      }

      .stylist-card .card-icon {
        background: #faeee6;
        color: #b46c49;
      }

      .card-heading h2 {
        margin: 0;
        color: #332c39;
        font-size: 18px;
        font-weight: 700;
      }

      .card-heading p {
        margin: 5px 0 0;
        color: #77717d;
        font-size: 13px;
        line-height: 1.45;
      }

      .category-list,
      .day-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 25px;
      }

      .category-pill,
      .day-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 34px;
        padding: 0 12px;
        border-radius: 999px;
        background: #f3eff5;
        color: #6d527b;
        font-size: 13px;
        font-weight: 600;
        white-space: nowrap;
      }

      .day-pill {
        min-width: 43px;
        background: #f1f3f8;
        color: #656f81;
      }

      .day-pill.today {
        background: #6d79b8;
        color: white;
        box-shadow: 0 3px 8px rgb(109 121 184 / 24%);
      }

      .score-list {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        justify-items: center;
        gap: 8px;
        margin-top: 18px;
      }

      .score-item {
        display: flex;
        min-width: 0;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        color: #77717d;
        font-size: 12px;
      }

      .card-link {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-top: auto;
        padding-top: 25px;
        color: #725184;
        font-size: 13px;
        font-weight: 700;
        text-decoration: none;
      }

      .card-link:hover {
        color: #503662;
      }

      .card-link i {
        font-size: 11px;
        transition: transform 150ms ease;
      }

      .card-link:hover i {
        transform: translateX(3px);
      }

      @media (max-width: 900px) {
        .dashboard-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .stylist-card {
          grid-column: 1 / -1;
        }
      }

      @media (max-width: 600px) {
        .header-content,
        .dashboard-content {
          width: min(100% - 32px, 480px);
        }

        .header-content {
          min-height: 0;
          flex-direction: column;
          align-items: stretch;
          gap: 12px;
          padding: 14px 0;
        }

        .main-nav {
          justify-content: space-between;
          gap: 2px;
        }

        .nav-link {
          justify-content: center;
          gap: 6px;
          padding: 9px 8px;
          font-size: 12px;
        }

        .dashboard-content {
          padding-top: 24px;
        }

        .welcome-panel {
          min-height: 0;
          padding: 24px;
        }

        .welcome-art {
          width: 62px;
          height: 62px;
          border-radius: 20px;
          font-size: 25px;
        }

        .welcome-copy {
          font-size: 14px;
        }

        .dashboard-grid {
          grid-template-columns: minmax(0, 1fr);
          gap: 14px;
          margin-top: 18px;
        }

        .stylist-card {
          grid-column: auto;
        }
      }

      @media (max-width: 380px) {
        .welcome-art {
          display: none;
        }

        .nav-link {
          font-size: 11px;
        }
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  categories: string[] = [];
  readonly days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  readonly today = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date());
  readonly scores = [
    { label: "Harmony", value: 0, color: "#80609a" },
    { label: "Weather", value: 0, color: "#6484ba" },
    { label: "Style", value: 0, color: "#c27d58" },
  ];
  error = "";

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.api.listWardrobe().subscribe({
      next: (items) => {
        const counts = new Map<string, number>();
        for (const item of items) {
          counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
        }
        this.categories = Array.from(counts, ([category, count]) => `${category} (${count})`);
        if (items.length > 0) {
          this.api.recommendations(this.api.todayLocalDate(), "casual")
            .subscribe({
              next: ({ outfit_recommendations }) => {
                const top = outfit_recommendations[0];
                if (top) {
                  this.scores[0].value = Math.round(top.harmony);
                  this.scores[1].value = Math.round(top.weather);
                  this.scores[2].value = Math.round(top.style_balance);
                }
              },
              error: (err: { error?: { detail?: string } }) => {
                this.error = err.error?.detail ?? "Could not load recommendation scores.";
              },
            });
        }
      },
      error: (err: { error?: { detail?: string } }) => {
        this.error = err.error?.detail ?? "Could not load dashboard data.";
      },
    });
  }
}
