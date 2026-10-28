// Alpine branch of the pipeline: mountain forecast and a packing grid.
// Forecasts come from Open-Meteo, which needs no API key.

import type { AccommodationType } from '@/lib/trips/types';

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

/** One cell of the packing grid. */
export type PackGroup = { title: string; items: string[] };

/**
 * Packing grid for an alpine stop. Hut trips pack light (the hut has beds,
 * blankets and often meals); tent trips carry shelter, sleep system, kitchen
 * and water treatment. Weather adds items to whichever list applies.
 * `forecast` may be empty when it hasn't loaded.
 */
export function buildPackGrid(accommodation: AccommodationType, forecast: DailyForecast[], nights: number): PackGroup[] {
  const coldest = forecast.length ? Math.min(...forecast.map((d) => d.tempMinC)) : null;
  const wettest = forecast.length ? Math.max(...forecast.map((d) => d.precipitationMm)) : 0;
  const windiest = forecast.length ? Math.max(...forecast.map((d) => d.windMaxKmh)) : 0;
  const days = nights + 1;

  const clothing = ['Base layer + spare socks', 'Fleece or light puffy', 'Sun hat, sunglasses, sun cream'];
  if (coldest !== null && coldest <= 2) clothing.push('Insulated jacket, gloves, beanie');
  if (wettest >= 2) clothing.push('Waterproof shell + rain pants');
  if (windiest >= 40) clothing.push(`Windproof layer (gusts to ${Math.round(windiest)} km/h)`);

  const navigation = ['Offline map / GPX', 'Headlamp + spare batteries', 'Power bank', 'First-aid + blister kit'];
  if (coldest !== null && coldest <= -2) navigation.push('Microspikes (ice on the route)');

  if (accommodation === 'hut') {
    return [
      { title: 'Sleep', items: ['Hut sleeping-bag liner (required)', 'Earplugs', 'Hut slippers or light camp shoes'] },
      { title: 'Food & water', items: ['2 L water', 'Trail snacks', 'Half-board booked? Otherwise lunch for each day'] },
      { title: 'Clothing', items: clothing },
      { title: 'Navigation & safety', items: navigation },
      { title: 'Paperwork', items: ['Hut booking confirmation + ID', 'Cash (many huts are cash only)', 'Alpine club card for member rates'] },
    ];
  }

  const sleepingBag =
    coldest === null ? 'Sleeping bag (check the forecast low)' : `Sleeping bag rated to ${Math.floor(coldest) - 3} °C or lower`;
  return [
    { title: 'Shelter', items: ['Tent or bivvy + pegs', 'Groundsheet / footprint', wettest >= 2 ? 'Guy lines pitched taut for rain' : 'Guy lines'] },
    { title: 'Sleep', items: ['Insulated sleeping pad (R-value 3+)', sleepingBag, 'Inflatable pillow'] },
    { title: 'Kitchen', items: ['Stove', 'Gas canister (buy on arrival, you can’t fly with one)', 'Pot, spork, lighter', `Dehydrated meals × ${nights}`, `Breakfast + snacks × ${days}`] },
    { title: 'Water', items: ['Water filter', 'Purification tablets (backup)', '2–3 L capacity', 'Dirty-water bag for the filter'] },
    { title: 'Clothing', items: clothing },
    { title: 'Navigation & safety', items: [...navigation, 'Check local bivouac rules: many alpine parks allow a tent only from dusk to dawn'] },
    { title: 'Leave no trace', items: ['Trowel + toilet bags', 'Rubbish bag (pack it all out)', 'Biodegradable soap'] },
  ];
}
