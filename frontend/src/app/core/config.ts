import { environment } from "../../environments/environment";

export class AppConfig {
  static readonly apiUrl: string = environment.apiUrl;
  static readonly apiPrefix: string = "/api/v1";
  static readonly maxUploadBytes: number = 5 * 1024 * 1024;
}

export function getSettings() {
  return {
    apiUrl: AppConfig.apiUrl,
    apiPrefix: AppConfig.apiPrefix,
    maxUploadBytes: AppConfig.maxUploadBytes,
  };
}