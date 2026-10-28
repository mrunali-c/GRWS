export type GenderIdentity = "female" | "male" | "non_binary" | "unspecified";
export type ComplexionSeason =
  | "winter"
  | "spring"
  | "summer"
  | "autumn"
  | "neutral-olive";

export interface UserProfileCreateDTO {
  gender_identity: GenderIdentity;
  complexion_season: ComplexionSeason | null;
  zip_code: string | null;
  skin_tone_rgb?: number[];
}

export interface UserProfileReadDTO extends UserProfileCreateDTO {
  id: string;
  updated_at: string;
}

export interface WardrobeItemCreateDTO {
  category: string;
  normalized_category: string;
  name: string;
  color_hex: string;
  image_thumbnail_path?: string | null;
  tags?: string[] | null;
  occasions?: string[] | null;
}

export interface WardrobeItemReadDTO {
  id: string;
  name: string;
  category: string;
  normalized_category: string;
  color_hex: string;
  thumbnail_url?: string | null;
  occasions?: string[] | null;
  tags?: string[] | null;
  score?: number;
  created_at?: string;
  updated_at?: string;
}

export interface OutfitAssignmentReadDTO {
  id: string;
  date: string;
  attire_id: string;
  accessory_id?: string | null;
  footwear_id?: string | null;
  attire_name: string;
  accessory_name?: string | null;
  footwear_name?: string | null;
  attire_color_hex: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface WeatherDaily {
  date: string;
  avg_temp: number;
  min_temp: number;
  max_temp: number;
  condition_code: string;
  precipitation_probability: number;
}