// Alpine branch of the pipeline: mountain forecast and a pack list.
// Forecasts come from Open-Meteo, which needs no API key.

export type DailyForecast = {
  date: string;
  tempMaxC: number;
  tempMinC: number;
  precipitationMm: number;
  windMaxKmh: number;
};

type OpenMeteoDaily = {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
  };
};

export async function fetchMountainForecast(lat: number, lng: number): Promise<DailyForecast[]> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max',
    timezone: 'auto',
    forecast_days: '7',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Forecast request failed (${res.status})`);
  const { daily } = (await res.json()) as OpenMeteoDaily;
  return daily.time.map((date, i) => ({
    date,
    tempMaxC: daily.temperature_2m_max[i],
    tempMinC: daily.temperature_2m_min[i],
    precipitationMm: daily.precipitation_sum[i],
    windMaxKmh: daily.wind_speed_10m_max[i],
  }));
}

const BASE_PACK = [
  'Hut sleeping-bag liner',
  'Headlamp + spare batteries',
  'Water (2 L) + filter',
  'First-aid kit and blister care',
  'Map / offline GPX + power bank',
  'Sun cream, sunglasses, cap',
  'Hut booking confirmation + ID',
  'Cash for the hut (many are cash only)',
];

export function buildPackList(forecast: DailyForecast[], nights: number): string[] {
  const items = [...BASE_PACK];
  const coldest = Math.min(...forecast.map((d) => d.tempMinC));
  const wettest = Math.max(...forecast.map((d) => d.precipitationMm));
  const windiest = Math.max(...forecast.map((d) => d.windMaxKmh));

  if (coldest <= 2) items.push('Insulated jacket, gloves and beanie');
  if (coldest <= -2) items.push('Microspikes (check for ice and snow on the route)');
  if (wettest >= 2) items.push('Waterproof shell + rain pants', 'Pack liner / dry bags');
  if (windiest >= 40) items.push('Windproof layer (ridge gusts over 40 km/h)');
  items.push(`Food for ${nights + 1} days, or check whether the hut does half-board`);
  return items;
}
