import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { KnobModule } from "primeng/knob";
import { ProgressBarModule } from "primeng/progressbar";
import { DropdownModule } from "primeng/dropdown";
import { InputTextModule } from "primeng/inputtext";
import { RatingModule } from "primeng/rating";
import { ApiService, Recommendation } from "../../core/services/api.service";

@Component({
  selector: "app-stylist",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    KnobModule,
    ProgressBarModule,
    DropdownModule,
    InputTextModule,
    RatingModule,
  ],
  template: `
    <div class="min-h-screen p-4 bg-gray-50 dark:bg-gray-900">
      <div class="max-w-2xl mx-auto">
        <!-- Header -->
        <div class="mb-6">
          <h1 class="text-2xl font-semibold">AI Stylist</h1>
          <p class="text-gray-500 dark:text-gray-400 text-sm">
            Get weather-aware outfit recommendations
          </p>
        </div>

        <!-- Recommendation Form -->
        <p-card class="mb-6">
          <h3 class="text-sm font-medium mb-3">Configuration</h3>

          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium mb-1">
                Complexion Season
              </label>
              <p-dropdown
                [options]="seasons"
                [(ngModel)]="selectedSeason"
                optionLabel="label"
                optionValue="value"
                styleClass="w-full"
                placeholder="Select season"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">
                Occasion
              </label>
              <input
                pInputText
                [(ngModel)]="selectedOccasion"
                placeholder="e.g. work, casual, night"
                class="w-full"
              />
            </div>
          </div>

          <div class="flex justify-end mb-4">
            <p-button
              label="Get Recommendations"
              icon="pi pi-magic"
              (onClick)="calculateScores()"
              [loading]="loading"
              [disabled]="loading"
              severity="primary"
              class="w-auto"
            />
          </div>
        </p-card>
        @if (error) {
          <p-card class="mt-4"><p role="alert">{{ error }}</p></p-card>
        }
        @if (recommendations.length > 0) {
          <p-card header="Recommended wardrobe items" class="mt-4">
            @for (item of recommendations; track item.item_id) {
              <article class="flex items-center justify-between gap-4 border-b py-3">
                <div>
                  <strong>{{ item.item_name }}</strong>
                  <p class="text-sm text-gray-500">{{ item.category | titlecase }}</p>
                </div>
                <div class="text-right">
                  <span class="font-semibold">{{ item.composite }}% match</span>
                  <p class="text-xs text-gray-500">
                    Color {{ item.harmony }} · Weather {{ item.weather }} · Style {{ item.style_balance }}
                  </p>
                </div>
              </article>
            }
          </p-card>
        }

        <!-- Score Matrix -->
        <p-card header="Match Matrix">
          <div class="grid grid-cols-3 gap-3 text-center p-4">
            <!-- Color Harmony -->
            <div>
              <p class="text-xs text-gray-500 mb-1">Color Harmony</p>
              <p-knob [ngModel]="harmonyScore" [readonly]="true" />
              <small class="text-xs mt-2">{{ harmonyScore }}%</small>
            </div>

            <!-- Weather Suitability -->
            <div>
              <p class="text-xs text-gray-500 mb-1">Weather Suitability</p>
              <p-progressBar
                [value]="weatherScore"
                class="w-32 h-8"
                
              />
              <small class="text-xs mt-2">{{ weatherScore }}%</small>
            </div>

            <!-- Style Balance -->
            <div>
              <p class="text-xs text-gray-500 mb-1">Style Balance</p>
              <p-knob [ngModel]="styleScore" [readonly]="true" />
              <small class="text-xs mt-2">{{ styleScore }}%</small>
            </div>
          </div>

          <!-- Composite Score -->
          <div class="mt-4 p-3 border-t border-gray-200 dark:border-gray-700">
            <p class="text-sm text-gray-500 mb-2">Composite Score</p>
            <p-progressBar
              [value]="compositeScore"
              class="w-full"
            />
            <div class="flex justify-between mt-2">
              <span class="text-sm text-gray-500">{{ compositeScore }}%</span>
              <span class="text-lg font-bold text-brand-600">
                {{ compositeScore }}% Match
              </span>
            </div>
          </div>
        </p-card>
      </div>
    </div>
  `,
})
export class StylistComponent {
  seasons = [
    { label: "Winter (Cool)", value: "winter" },
    { label: "Spring (Bright)", value: "spring" },
    { label: "Summer (Soft)", value: "summer" },
    { label: "Autumn (Warm)", value: "autumn" },
    { label: "Neutral-Olive", value: "neutral-olive" },
  ];

  selectedSeason = "winter";
  selectedOccasion = "casual";

  harmonyScore = 55;
  weatherScore = 70;
  styleScore = 65;
  compositeScore = 63;
  recommendations: Recommendation[] = [];
  loading = false;
  error = "";

  constructor(private readonly api: ApiService) {}

  calculateScores() {
    this.loading = true;
    this.error = "";
    this.api.recommendations(this.api.todayLocalDate(), this.selectedOccasion)
      .subscribe({
        next: (result) => {
          this.recommendations = result.outfit_recommendations;
          if (!this.recommendations.length) {
            this.error = typeof result.summary === "string"
              ? result.summary
              : "Add wardrobe items to receive recommendations.";
          } else {
            const best = this.recommendations[0];
            this.harmonyScore = Math.round(best.harmony);
            this.weatherScore = Math.round(best.weather);
            this.styleScore = Math.round(best.style_balance);
            this.compositeScore = Math.round(best.composite);
          }
          this.loading = false;
        },
        error: (err: { error?: { detail?: string } }) => {
          this.error = err.error?.detail ?? "Could not load recommendations.";
          this.loading = false;
        },
      });
  }
}