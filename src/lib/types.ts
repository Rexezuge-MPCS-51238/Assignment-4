export type WeatherObservationRow = {
  apparent_temperature_c: number;
  city_name: string;
  city_slug: string;
  cloud_cover_pct: number;
  country: string;
  fetched_at: string;
  is_day: boolean;
  latitude: number;
  longitude: number;
  observed_at: string;
  precipitation_mm: number;
  temperature_c: number;
  weather_code: number;
  weather_label: string;
  wind_direction_deg: number;
  wind_speed_kph: number;
};

export type UserFavoriteRow = {
  id: string;
  user_id: string;
  city_slug: string;
  created_at: string;
};

type UserFavoriteInsert = Pick<UserFavoriteRow, "user_id" | "city_slug"> &
  Partial<Pick<UserFavoriteRow, "id" | "created_at">>;

export type Database = {
  public: {
    Tables: {
      weather_observations: {
        Row: WeatherObservationRow;
        Insert: WeatherObservationRow;
        Update: Partial<WeatherObservationRow>;
        Relationships: [];
      };
      user_favorites: {
        Row: UserFavoriteRow;
        Insert: UserFavoriteInsert;
        Update: Partial<UserFavoriteInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
