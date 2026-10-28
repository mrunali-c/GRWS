import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { CalendarModule } from "primeng/calendar";
import { DropdownModule } from "primeng/dropdown";

import { ApiService } from "../../core/services/api.service";
import { OutfitAssignmentReadDTO, WardrobeItemReadDTO } from "../../core/models/dtos";

@Component({
  selector: "app-planner",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    ButtonModule,
    CardModule,
    CalendarModule,
    DropdownModule,
  ],
  template: `
    <div class="planner-page">
      <header class="planner-header">
        <div class="planner-header-content">
          <a class="planner-brand" routerLink="/dashboard" aria-label="AI Personal Stylist home">
            <span class="planner-brand-mark"><i class="pi pi-sparkles"></i></span>
            <span>AI Personal Stylist</span>
          </a>
          <nav class="planner-nav" aria-label="Main navigation">
            <a routerLink="/wardrobe" routerLinkActive="active" class="planner-nav-link">
              <i class="pi pi-box"></i><span>Wardrobe</span>
            </a>
            <a routerLink="/planner" routerLinkActive="active" class="planner-nav-link">
              <i class="pi pi-calendar"></i><span>Planner</span>
            </a>
            <a routerLink="/stylist" routerLinkActive="active" class="planner-nav-link">
              <i class="pi pi-sliders-h"></i><span>Stylist</span>
            </a>
          </nav>
        </div>
      </header>

      <main class="planner-content">
        <section class="planner-intro">
          <div>
            <p class="planner-eyebrow">MAKE EVERY DAY FEEL PUT TOGETHER</p>
            <h1>Weekly Planner</h1>
            <p>Plan and schedule outfits for the week</p>
          </div>
          <div class="planner-intro-icon" aria-hidden="true">
            <i class="pi pi-calendar"></i>
          </div>
        </section>

        @if (error) {
          <p-card class="planner-panel planner-error" role="alert">
            <div class="planner-error-content">
              <i class="pi pi-exclamation-circle"></i>
              <span>{{ error }}</span>
            </div>
          </p-card>
        }

        <section class="planner-grid" aria-label="Plan your outfits">
          <p-card class="planner-panel planner-form-panel">
            <ng-template pTemplate="title">
              <div class="planner-card-title">
                <span class="planner-card-icon date-icon"><i class="pi pi-calendar-plus"></i></span>
                <div>
                  <h2>Plan an outfit</h2>
                  <p>Choose a date and an item from your wardrobe</p>
                </div>
              </div>
            </ng-template>
            <ng-template pTemplate="content">
              <form class="planner-form" (ngSubmit)="schedule()">
                <label class="planner-field">
                  <span>Choose an outfit date</span>
                  <p-calendar
                    inputId="planner-date"
                    name="plannerDate"
                    [(ngModel)]="selectedDate"
                    dateFormat="D, d M yy"
                    [showIcon]="true"
                    iconDisplay="input"
                    [touchUI]="isMobile"
                    styleClass="planner-calendar"
                  >
                    <ng-template pTemplate="footer">
                      <div class="planner-calendar-footer">
                        <i class="pi pi-info-circle"></i>
                        <span>Pick the day you want to wear this outfit.</span>
                      </div>
                    </ng-template>
                  </p-calendar>
                </label>

                <label class="planner-field" for="planner-attire">
                  <span>Wardrobe item</span>
                  <p-dropdown
                    inputId="planner-attire"
                    name="plannerAttire"
                    [options]="items"
                    [(ngModel)]="selectedAttireId"
                    optionLabel="name"
                    optionValue="id"
                    placeholder="Select an item"
                    emptyMessage="Your wardrobe is empty"
                    emptyFilterMessage="No matching wardrobe items"
                    [filter]="true"
                    filterBy="name,normalized_category"
                    styleClass="planner-item-dropdown"
                    panelStyleClass="planner-item-panel"
                  >
                    <ng-template pTemplate="selectedItem" let-item>
                      <div class="planner-item-option" *ngIf="item">
                        <span
                          class="planner-item-swatch"
                          [style.backgroundColor]="item.color_hex"
                        ></span>
                        <span class="planner-item-option-text">
                          <strong>{{ item.name }}</strong>
                          <small>{{ item.normalized_category | titlecase }}</small>
                        </span>
                      </div>
                    </ng-template>
                    <ng-template pTemplate="item" let-item>
                      <div class="planner-item-option">
                        <span
                          class="planner-item-swatch"
                          [style.backgroundColor]="item.color_hex"
                        ></span>
                        <span class="planner-item-option-text">
                          <strong>{{ item.name }}</strong>
                          <small>{{ item.normalized_category | titlecase }}</small>
                        </span>
                      </div>
                    </ng-template>
                    <ng-template pTemplate="empty">
                      <div class="planner-dropdown-empty">
                        <i class="pi pi-inbox"></i>
                        <span>Add an item to your wardrobe first.</span>
                      </div>
                    </ng-template>
                  </p-dropdown>
                </label>

                <div class="planner-form-actions">
                  <p-button
                    type="submit"
                    label="Schedule outfit"
                    icon="pi pi-calendar-plus"
                    [disabled]="!selectedAttireId || saving"
                    [loading]="saving"
                  />
                  <p-button
                    type="button"
                    label="Refresh week"
                    icon="pi pi-refresh"
                    [outlined]="true"
                    [loading]="loadingWeek"
                    (onClick)="loadWeek()"
                  />
                </div>
              </form>
            </ng-template>
          </p-card>

          <p-card class="planner-panel scheduled-panel">
            <ng-template pTemplate="title">
              <div class="planner-schedule-heading">
                <div class="planner-card-title">
                  <span class="planner-card-icon schedule-icon"><i class="pi pi-list"></i></span>
                  <div>
                    <h2>Scheduled outfits</h2>
                    <p>Your plans for this week</p>
                  </div>
                </div>
                <span class="planner-outfit-count">{{ outfits.length }}</span>
              </div>
            </ng-template>
            <ng-template pTemplate="content">
              @if (outfits.length === 0) {
                <div class="planner-empty-state">
                  <span class="planner-empty-icon"><i class="pi pi-calendar"></i></span>
                  <strong>No outfits scheduled yet</strong>
                  <p>Choose a wardrobe item and date to add your first outfit.</p>
                </div>
              } @else {
                <div class="planner-outfit-list">
                  @for (outfit of outfits; track outfit.id) {
                    <article class="planner-outfit">
                      <span
                        class="planner-outfit-swatch"
                        [style.backgroundColor]="outfit.attire_color_hex"
                      ></span>
                      <div class="planner-outfit-details">
                        <strong>{{ outfit.attire_name }}</strong>
                        <span>{{ outfit.date | date:'fullDate' }}</span>
                      </div>
                      <span class="planner-outfit-status">{{ outfit.status | titlecase }}</span>
                      <p-button
                        icon="pi pi-trash"
                        [rounded]="true"
                        [text]="true"
                        severity="danger"
                        [attr.aria-label]="'Remove outfit scheduled for ' + outfit.date"
                        (onClick)="remove(outfit)"
                      />
                    </article>
                  }
                </div>
              }
            </ng-template>
          </p-card>
        </section>
      </main>
    </div>
  `,
})
export class PlannerComponent implements OnInit {
  selectedDate = new Date();
  selectedAttireId = "";
  items: WardrobeItemReadDTO[] = [];
  outfits: OutfitAssignmentReadDTO[] = [];
  error = "";
  saving = false;
  loadingWeek = false;
  readonly isMobile = window.matchMedia("(max-width: 600px)").matches;

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.api.listWardrobe().subscribe({
      next: (items) => (this.items = items),
      error: (err: { error?: { detail?: string } }) => {
        this.error = err.error?.detail ?? "Could not load wardrobe items.";
      },
    });
    this.loadWeek();
  }

  loadWeek(): void {
    this.error = "";
    this.loadingWeek = true;
    this.api.getWeek(this.weekStart(this.selectedDate)).subscribe({
      next: (summary) => {
        this.outfits = summary.outfits;
        this.loadingWeek = false;
      },
      error: (err: { error?: { detail?: string } }) => {
        this.error = err.error?.detail ?? "Could not load this week's schedule.";
        this.loadingWeek = false;
      },
    });
  }

  schedule(): void {
    if (!this.selectedAttireId) return;
    this.saving = true;
    this.error = "";
    this.api.scheduleOutfit({
      date: this.localDate(this.selectedDate),
      attire_id: this.selectedAttireId,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.loadWeek();
      },
      error: (err: { error?: { detail?: string } }) => {
        this.error = err.error?.detail ?? "Could not schedule this outfit.";
        this.saving = false;
      },
    });
  }

  remove(outfit: OutfitAssignmentReadDTO): void {
    this.api.deleteOutfit(outfit.id).subscribe({
      next: () => (this.outfits = this.outfits.filter((item) => item.id !== outfit.id)),
      error: (err: { error?: { detail?: string } }) => {
        this.error = err.error?.detail ?? "Could not remove this outfit.";
      },
    });
  }

  private weekStart(value: Date): string {
    const monday = new Date(value.getFullYear(), value.getMonth(), value.getDate());
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return this.localDate(monday);
  }

  private localDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
