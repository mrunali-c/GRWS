import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";

import { ApiService } from "../../core/services/api.service";

@Component({
  selector: "app-auth",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="max-w-md mx-auto p-6">
      <h1 class="text-2xl font-semibold">{{ registering ? "Create account" : "Sign in" }}</h1>
      <p class="text-gray-500 mb-5">Save your wardrobe and plans to your account.</p>
      <form (ngSubmit)="submit()" class="grid gap-4">
        <label class="grid gap-1">
          Username
          <input name="username" [(ngModel)]="username" required minlength="3" maxlength="80" autocomplete="username" />
        </label>
        <label class="grid gap-1">
          Password
          <input name="password" type="password" [(ngModel)]="password" required minlength="8" maxlength="72" autocomplete="current-password" />
        </label>
        @if (error) { <p role="alert" class="text-red-600">{{ error }}</p> }
        <button type="submit" [disabled]="busy" class="rounded bg-purple-700 px-4 py-2 text-white">
          {{ busy ? "Please wait..." : (registering ? "Create account" : "Sign in") }}
        </button>
      </form>
      <button type="button" class="mt-4 text-purple-700 underline" (click)="toggleMode()">
        {{ registering ? "Already have an account? Sign in" : "Need an account? Sign up" }}
      </button>
      <p class="mt-4"><a routerLink="/dashboard" class="text-purple-700 underline">Continue in local mode</a></p>
    </main>
  `,
})
export class AuthComponent {
  username = "";
  password = "";
  registering = false;
  busy = false;
  error = "";

  constructor(
    private readonly api: ApiService,
    private readonly router: Router,
  ) {}

  toggleMode(): void {
    this.registering = !this.registering;
    this.error = "";
  }

  submit(): void {
    this.busy = true;
    this.error = "";
    const request = this.registering
      ? this.api.signUp(this.username.trim(), this.password)
      : this.api.login(this.username.trim(), this.password);
    request.subscribe({
      next: () => {
        this.busy = false;
        void this.router.navigateByUrl("/dashboard");
      },
      error: (err: { error?: { detail?: string } }) => {
        this.error = err.error?.detail ?? "Could not authenticate. Check your backend connection.";
        this.busy = false;
      },
    });
  }
}
