import { Component, OnInit, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { FileUpload, FileUploadModule } from "primeng/fileupload";
import { ApiService } from "../../core/services/api.service";
import { WardrobeItemReadDTO } from "../../core/models/dtos";

@Component({
  selector: "app-wardrobe",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, ButtonModule, CardModule, FileUploadModule],
  template: `
    <div class="wardrobe-page">
      <header class="wardrobe-header">
        <div class="wardrobe-header-content">
          <a class="wardrobe-brand" routerLink="/dashboard" aria-label="AI Personal Stylist home">
            <span class="wardrobe-brand-mark"><i class="pi pi-sparkles"></i></span>
            <span>AI Personal Stylist</span>
          </a>
          <nav class="wardrobe-nav" aria-label="Main navigation">
            <a routerLink="/wardrobe" routerLinkActive="active" class="wardrobe-nav-link">
              <i class="pi pi-box"></i><span>Wardrobe</span>
            </a>
            <a routerLink="/planner" routerLinkActive="active" class="wardrobe-nav-link">
              <i class="pi pi-calendar"></i><span>Planner</span>
            </a>
            <a routerLink="/stylist" routerLinkActive="active" class="wardrobe-nav-link">
              <i class="pi pi-sliders-h"></i><span>Stylist</span>
            </a>
          </nav>
        </div>
      </header>

      <main class="wardrobe-content">
        <section class="wardrobe-intro">
          <div>
            <p class="wardrobe-eyebrow">YOUR PERSONAL STYLE, IN ONE PLACE</p>
            <h1>Digital Wardrobe</h1>
            <p>Upload and manage your clothing items</p>
          </div>
          <div class="wardrobe-intro-icon" aria-hidden="true">
            <i class="pi pi-box"></i>
          </div>
        </section>

        <section class="wardrobe-layout" aria-label="Manage your wardrobe">
          <p-card class="wardrobe-panel upload-panel">
            <div class="wardrobe-panel-heading">
              <span class="wardrobe-panel-icon upload-icon"><i class="pi pi-cloud-upload"></i></span>
              <div>
                <h2>Add items</h2>
                <p>Add photos to build your digital closet</p>
              </div>
            </div>

            <form class="wardrobe-item-form" (ngSubmit)="addItem()">
              <label>
                Item name
                <input name="name" [(ngModel)]="name" required maxlength="120" />
              </label>
              <label>
                Category
                <select name="category" [(ngModel)]="category" required>
                  @for (option of categories; track option) {
                    <option [value]="option">{{ option | titlecase }}</option>
                  }
                </select>
              </label>
              <label>
                Main color
                <input name="color" type="color" [(ngModel)]="colorHex" />
              </label>
              <label>
                Tags (comma separated)
                <input name="tags" [(ngModel)]="tags" placeholder="wool, warm" />
              </label>
              <label>
                Occasions (comma separated)
                <input name="occasions" [(ngModel)]="occasions" placeholder="work, casual" />
              </label>
              <div class="photo-field">
                <p class="photo-field-label">
                  Photo <span class="optional-label">Optional · JPEG, PNG or WebP · Up to 5 MB</span>
                </p>
                <p-fileUpload
                  #photoUpload
                  name="photo"
                  mode="advanced"
                  accept="image/jpeg,image/png,image/webp"
                  [maxFileSize]="5000000"
                  [fileLimit]="1"
                  [showUploadButton]="false"
                  [showCancelButton]="false"
                  chooseLabel="Choose a photo"
                  chooseIcon="pi pi-images"
                  styleClass="wardrobe-photo-upload"
                  (onSelect)="selectFile($event)"
                  (onClear)="clearFile()"
                  (onRemove)="clearFile()"
                >
                  <ng-template pTemplate="content" let-files>
                    <div class="photo-dropzone" *ngIf="files.length === 0">
                      <span class="photo-dropzone-icon"><i class="pi pi-cloud-upload"></i></span>
                      <strong>Drop a clothing photo here</strong>
                      <span>or select a photo from your device</span>
                    </div>
                  </ng-template>
                </p-fileUpload>
              </div>
              @if (error) { <p role="alert">{{ error }}</p> }
              @if (message) { <p role="status">{{ message }}</p> }
              <p-button
                type="submit"
                label="Add to wardrobe"
                icon="pi pi-plus"
                [loading]="saving"
                [disabled]="saving"
              />
            </form>
          </p-card>

          <p-card class="wardrobe-panel inventory-panel">
            <div class="inventory-heading">
              <div class="wardrobe-panel-heading">
                <span class="wardrobe-panel-icon inventory-icon"><i class="pi pi-th-large"></i></span>
                <div>
                  <h2>Your items</h2>
                  <p>Clothing saved in your closet</p>
                </div>
              </div>
              <span class="item-count">{{ items.length }} items</span>
            </div>

            <div class="inventory-table-wrap">
              <table class="wardrobe-table">
                <thead>
                  <tr>
                    <th scope="col">Photo</th>
                    <th scope="col">Item</th>
                    <th scope="col">Color</th>
                    <th scope="col"><span class="visually-hidden">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of items; track item.id) {
                    <tr>
                      <td data-label="Photo">
                        <img
                          [src]="api.imageUrl(item.thumbnail_url)"
                          [alt]="item.name"
                          class="wardrobe-thumbnail"
                          *ngIf="item.thumbnail_url"
                        />
                        <span *ngIf="!item.thumbnail_url">No photo</span>
                      </td>
                      <td data-label="Item">
                        <span class="wardrobe-item-name">{{ item.name }}</span>
                        <span class="wardrobe-item-category">{{ item.normalized_category | titlecase }}</span>
                      </td>
                      <td data-label="Color">
                        <span class="wardrobe-color">
                          <span
                            class="wardrobe-color-swatch"
                            [style.backgroundColor]="item.color_hex"
                            [class.light-swatch]="item.color_hex.toLowerCase() === '#ffffff'"
                          ></span>
                          <span>{{ item.color_hex }}</span>
                        </span>
                      </td>
                      <td data-label="Actions" class="wardrobe-actions">
                        <p-button
                          icon="pi pi-trash"
                          [rounded]="true"
                          [text]="true"
                          severity="danger"
                          [attr.aria-label]="'Remove ' + item.name"
                          (onClick)="removeItem(item.id)"
                        />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>

              @if (items.length === 0) {
                <div class="wardrobe-empty-state">
                  <span class="wardrobe-empty-state-icon"><i class="pi pi-inbox"></i></span>
                  <strong>Your wardrobe is empty</strong>
                  <p>Add your first item to get started.</p>
                </div>
              }
            </div>
          </p-card>
        </section>
      </main>
    </div>
  `,
})
export class WardrobeComponent implements OnInit {
  readonly categories = [
    "tops", "bottoms", "dresses", "outerwear", "suits", "traditional",
    "bags", "jewelry", "belts", "hats", "watches", "scarves",
    "sneakers", "formal", "heels", "boots", "sandals",
  ];
  items: WardrobeItemReadDTO[] = [];
  name = "";
  category = "tops";
  colorHex = "#76518d";
  tags = "";
  occasions = "";
  file: File | null = null;
  saving = false;
  error = "";
  message = "";

  @ViewChild("photoUpload") photoUpload?: FileUpload;

  constructor(readonly api: ApiService) {}

  ngOnInit(): void {
    this.loadItems();
  }

  selectFile(event: { currentFiles: File[] }): void {
    this.file = event.currentFiles[0] ?? null;
  }

  clearFile(): void {
    this.file = null;
  }

  addItem(): void {
    this.error = "";
    this.message = "";
    const form = new FormData();
    form.set("name", this.name.trim());
    form.set("category", this.category);
    form.set("color_hex", this.colorHex);
    form.set("tags", this.tags);
    form.set("occasions", this.occasions);
    if (this.file) form.set("file", this.file);

    this.saving = true;
    this.api.createWardrobeItem(form).subscribe({
      next: (item) => {
        this.items = [item, ...this.items];
        this.name = "";
        this.tags = "";
        this.occasions = "";
        this.file = null;
        this.photoUpload?.clear();
        this.message = "Item added to your wardrobe.";
        this.saving = false;
      },
      error: (err: { error?: { detail?: string } }) => {
        this.error = err.error?.detail ?? "Could not add this item. Check the backend connection.";
        this.saving = false;
      },
    });
  }

  removeItem(id: string): void {
    this.api.deleteWardrobeItem(id).subscribe({
      next: () => (this.items = this.items.filter((item) => item.id !== id)),
      error: (err: { error?: { detail?: string } }) => {
        this.error = err.error?.detail ?? "Could not remove this item.";
      },
    });
  }

  private loadItems(): void {
    this.api.listWardrobe().subscribe({
      next: (items) => (this.items = items),
      error: (err: { error?: { detail?: string } }) => {
        this.error = err.error?.detail ?? "Could not load your wardrobe.";
      },
    });
  }
}
