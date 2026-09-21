import * as exifr from 'exifr';

const formatCoordinate = (value) => Number(value).toFixed(6);

export async function readImageLocation(file) {
  try {
    const gps = await exifr.gps(file);
    if (!gps || !Number.isFinite(gps.latitude) || !Number.isFinite(gps.longitude)) {
      return null;
    }

    const latitude = Number(gps.latitude);
    const longitude = Number(gps.longitude);
    let address = '';

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
        { headers: { Accept: 'application/json' } },
      );
      if (response.ok) {
        const data = await response.json();
        address = data.display_name || '';
      }
    } catch {
      // Coordinates are still useful when reverse geocoding is unavailable.
    }

    return {
      latitude,
      longitude,
      coordinates: `${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}`,
      address,
      source: 'photo GPS metadata',
    };
  } catch {
    return null;
  }
}
