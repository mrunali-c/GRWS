import { Routes } from "@angular/router";

import { ProfileComponent } from "./features/profile/profile.component";
import { WardrobeComponent } from "./features/wardrobe/wardrobe.component";
import { PlannerComponent } from "./features/planner/planner.component";
import { StylistComponent } from "./features/stylist/stylist.component";
import { DashboardComponent } from "./features/dashboard/dashboard.component";
import { AuthComponent } from "./features/auth/auth.component";

export const routes: Routes = [
  {
    path: "",
    redirectTo: "dashboard",
    pathMatch: "full",
  },
  {
    path: "auth",
    title: "Sign in",
    component: AuthComponent,
  },
  {
    path: "dashboard",
    title: "Dashboard",
    component: DashboardComponent,
  },
  {
    path: "profile",
    title: "Profile & Complexion",
    component: ProfileComponent,
  },
  {
    path: "wardrobe",
    title: "Digital Wardrobe",
    component: WardrobeComponent,
  },
  {
    path: "planner",
    title: "Weekly Planner",
    component: PlannerComponent,
  },
  {
    path: "stylist",
    title: "AI Stylist",
    component: StylistComponent,
  },
  {
    path: "**",
    redirectTo: "dashboard",
  },
];