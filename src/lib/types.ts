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

export type Database = {
  public: {
    Tables: {
      weather_observations: {
        Row: WeatherObservationRow;
      };
    };
  };
};
