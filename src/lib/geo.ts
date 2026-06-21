export interface GeoAddress {
  display_name: string;
  road?: string;
  suburb?: string;
  city?: string;
  county?: string;
}

export async function reverseGeocode(lat: number, lon: number): Promise<GeoAddress | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          // OpenStreetMap requests a unique User-Agent identifier
          'User-Agent': 'Ushanga-Chronicles-App' 
        }
      }
    );
    if (!response.ok) throw new Error('Network error');
    const data = await response.json();
    return {
      display_name: data.display_name,
      road: data.address?.road,
      suburb: data.address?.suburb,
      city: data.address?.city || data.address?.town || data.address?.village,
      county: data.address?.county
    };
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return null;
  }
}
