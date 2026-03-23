import { NextResponse } from "next/server";

// Boulder, CO coordinates
const LAT = 40.015;
const LON = -105.2705;

export async function GET() {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weathercode,windspeed_10m,relative_humidity_2m&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=America%2FDenver`,
      { next: { revalidate: 1800 } } // cache 30 min
    );
    if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
    const data = await res.json();

    const code = data.current?.weathercode ?? 0;
    const temp = Math.round(data.current?.temperature_2m ?? 0);
    const wind = Math.round(data.current?.windspeed_10m ?? 0);
    const humidity = data.current?.relative_humidity_2m ?? 0;

    const condition = getCondition(code);

    return NextResponse.json({
      temp,
      condition,
      wind,
      humidity,
      location: "Boulder, CO",
      icon: getIcon(code),
    });
  } catch (err) {
    return NextResponse.json({
      temp: null,
      condition: "Unknown",
      wind: null,
      humidity: null,
      location: "Boulder, CO",
      icon: "🌡️",
      error: String(err),
    });
  }
}

function getCondition(code: number): string {
  if (code === 0) return "Clear Sky";
  if (code <= 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if (code <= 49) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rainy";
  if (code <= 77) return "Snowy";
  if (code <= 82) return "Rain Showers";
  if (code <= 86) return "Snow Showers";
  if (code <= 99) return "Thunderstorm";
  return "Unknown";
}

function getIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "⛅";
  if (code === 3) return "☁️";
  if (code <= 49) return "🌫️";
  if (code <= 57) return "🌦️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  if (code <= 86) return "🌨️";
  if (code <= 99) return "⛈️";
  return "🌡️";
}
