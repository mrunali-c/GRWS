import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { InputTextModule } from "primeng/inputtext";
import { SelectButtonModule } from "primeng/selectbutton";
import { DropdownModule } from "primeng/dropdown";
import { MessageModule } from "primeng/message";
import { RippleModule } from "primeng/ripple";
import { ApiService } from "../../core/services/api.service";
import { UserProfileCreateDTO } from "../../core/models/dtos";

@Component({
  selector: "app-profile",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    SelectButtonModule,
    DropdownModule,
    MessageModule,
    RippleModule,
  ],
  template: `
    <div class="min-h-screen p-4 bg-gray-50 dark:bg-gray-900">
      <div class="max-w-xl mx-auto">
        <!-- Header -->
        <div class="mb-6">
          <h1 class="text-2xl font-semibold mb-2">Profile & Complexion Setup</h1>
          <p class="text-gray-500 dark:text-gray-400 text-sm">
            Configure your preferences for personalized recommendations
          </p>
        </div>

        <!-- Profile Card -->
        <p-card class="p-shadow">
          <div class="p-field p-fluid">
            <label for="gender" class="block text-sm font-medium mb-1">
              Gender Identity
            </label>
            <p-selectButton
              id="gender"
              [options]="genderOptions"
              [(ngModel)]="selectedGender"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full"
            />
          </div>

          <div class="p-field p-fluid mt-4">
            <label for="complexion" class="block text-sm font-medium mb-1">
              Complexion Season (Color Theory)
            </label>
            <p-dropdown
              id="complexion"
              [options]="seasonOptions"
              [(ngModel)]="selectedSeason"
              optionLabel="label"
              optionValue="value"
              placeholder="Select a season"
              styleClass="w-full"
            />
          </div>

          <div class="p-field p-fluid mt-4">
            <label for="zip" class="block text-sm font-medium mb-1">
              ZIP Code / Geolocation
            </label>
            <input pInputText
              id="zip"
              type="text"
              [(ngModel)]="selectedZip"
              placeholder="e.g. 90210"
              class="w-full"
              />
          </div>

          <!-- Action Buttons -->
          <div class="mt-6 flex gap-3">
            <p-button
              label="Save Profile"
              icon="pi pi-save"
              (onClick)="saveProfile()"
              severity="primary"
              class="w-full sm:w-auto"
            />
            <p-button
              label="Reset"
              icon="pi pi-refresh"
              [outlined]="true"
              (onClick)="reset()"
              class="w-full sm:w-auto"
            />
          </div>

          <!-- Status Message -->
          @if (saved) {
            <p-message
              severity="success"
              text="Profile saved successfully!"
              life="3000"
            />
          }
          @if (error) {
            <p-message severity="error" [text]="error" />
          }
        </p-card>
      </div>
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  genderOptions = [
    { label: "Female", value: "female" },
    { label: "Male", value: "male" },
    { label: "Non-Binary", value: "non_binary" },
    { label: "Unspecified", value: "unspecified" },
  ];

  seasonOptions = [
    { label: "Winter (Cool)", value: "winter" },
    { label: "Spring (Bright)", value: "spring" },
    { label: "Summer (Soft)", value: "summer" },
    { label: "Autumn (Warm)", value: "autumn" },
    { label: "Neutral-Olive", value: "neutral-olive" },
  ];

  selectedGender: UserProfileCreateDTO["gender_identity"] = "unspecified";
  selectedSeason: UserProfileCreateDTO["complexion_season"] = null;
  selectedZip = "";
  saved = false;
  error = "";

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.api.getProfile().subscribe({
      next: (profile) => {
        this.selectedGender = profile.gender_identity;
        this.selectedSeason = profile.complexion_season;
        this.selectedZip = profile.zip_code ?? "";
      },
      error: (err: { error?: { detail?: string } }) => {
        this.error = err.error?.detail ?? "Could not load your profile.";
      },
    });
  }

  saveProfile() {
    this.error = "";
    this.saved = false;
    this.api.saveProfile({
      gender_identity: this.selectedGender,
      complexion_season: this.selectedSeason,
      zip_code: this.selectedZip.trim() || null,
    }).subscribe({
      next: () => {
        this.saved = true;
        setTimeout(() => (this.saved = false), 3000);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.error = err.error?.detail ?? "Could not save your profile.";
      },
    });
  }

  reset() {
    this.selectedGender = "unspecified";
    this.selectedSeason = null;
    this.selectedZip = "";
  }
}