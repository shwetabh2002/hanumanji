/**
 * Popular Destinations Configuration
 *
 * Pari Chowk, Greater Noida area
 * These are pre-configured destinations that appear as "Quick Book" options in rider app
 */

export interface PopularDestination {
  id: string;
  name: string;
  nameHi: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  category: 'metro' | 'college' | 'market' | 'residential' | 'commercial' | 'hospital';
  icon: string;
  averageFare: number;  // Estimated (3km baseline)
  popularWith: ('students' | 'professionals' | 'residents')[];
  landmark?: string;
  landmarkHi?: string;
}

export const PARI_CHOWK_POPULAR_DESTINATIONS: PopularDestination[] = [
  {
    id: 'knowledge-park-metro',
    name: 'Knowledge Park Metro Station',
    nameHi: 'नॉलेज पार्क मेट्रो स्टेशन',
    coordinates: { lat: 28.4759, lng: 77.4985 },
    category: 'metro',
    icon: '🚇',
    averageFare: 30,
    popularWith: ['students', 'professionals'],
    landmark: 'Gate 2, Aqua Line',
    landmarkHi: 'गेट 2, एक्वा लाइन'
  },
  {
    id: 'pari-chowk-metro',
    name: 'Pari Chowk Metro Station',
    nameHi: 'परी चौक मेट्रो स्टेशन',
    coordinates: { lat: 28.4731, lng: 77.4871 },
    category: 'metro',
    icon: '🚇',
    averageFare: 20,
    popularWith: ['students', 'professionals', 'residents'],
    landmark: 'Near Jaypee Hospital',
    landmarkHi: 'जेपी हॉस्पिटल के पास'
  },
  {
    id: 'gbu-main-gate',
    name: 'Gautam Buddha University - Main Gate',
    nameHi: 'गौतम बुद्ध विश्वविद्यालय - मुख्य गेट',
    coordinates: { lat: 28.4563, lng: 77.5049 },
    category: 'college',
    icon: '🎓',
    averageFare: 40,
    popularWith: ['students'],
    landmark: 'University Main Entrance',
    landmarkHi: 'यूनिवर्सिटी मुख्य प्रवेश द्वार'
  },
  {
    id: 'gbu-academic-block',
    name: 'GBU Academic Block',
    nameHi: 'GBU एकेडमिक ब्लॉक',
    coordinates: { lat: 28.4552, lng: 77.5058 },
    category: 'college',
    icon: '🏫',
    averageFare: 42,
    popularWith: ['students'],
    landmark: 'Inside GBU Campus',
    landmarkHi: 'GBU कैंपस के अंदर'
  },
  {
    id: 'pari-chowk-market',
    name: 'Pari Chowk Market',
    nameHi: 'परी चौक मार्केट',
    coordinates: { lat: 28.4744, lng: 77.4920 },
    category: 'market',
    icon: '🛒',
    averageFare: 25,
    popularWith: ['students', 'residents'],
    landmark: 'Near CCD, Pari Chowk Roundabout',
    landmarkHi: 'CCD के पास, परी चौक चौराहा'
  },
  {
    id: 'sector-omega',
    name: 'Sector Omega',
    nameHi: 'सेक्टर ओमेगा',
    coordinates: { lat: 28.4682, lng: 77.5121 },
    category: 'residential',
    icon: '🏘️',
    averageFare: 45,
    popularWith: ['professionals', 'residents'],
    landmark: 'Residential Area, Near Omega Mall',
    landmarkHi: 'आवासीय क्षेत्र, ओमेगा मॉल के पास'
  },
  {
    id: 'alpha-commercial-belt',
    name: 'Alpha Commercial Belt',
    nameHi: 'अल्फा कमर्शियल बेल्ट',
    coordinates: { lat: 28.4691, lng: 77.5051 },
    category: 'commercial',
    icon: '🏢',
    averageFare: 43,
    popularWith: ['professionals'],
    landmark: 'Alpha 1, Shopping Complex',
    landmarkHi: 'अल्फा 1, शॉपिंग कॉम्प्लेक्स'
  },
  {
    id: 'gniot-college',
    name: 'GNIOT College',
    nameHi: 'GNIOT कॉलेज',
    coordinates: { lat: 28.4692, lng: 77.4984 },
    category: 'college',
    icon: '🎓',
    averageFare: 38,
    popularWith: ['students'],
    landmark: 'Greater Noida Institute of Technology',
    landmarkHi: 'ग्रेटर नोएडा इंस्टिट्यूट ऑफ टेक्नोलॉजी'
  },
  {
    id: 'gl-bajaj-college',
    name: 'GL Bajaj College',
    nameHi: 'GL बजाज कॉलेज',
    coordinates: { lat: 28.4657, lng: 77.4968 },
    category: 'college',
    icon: '🎓',
    averageFare: 35,
    popularWith: ['students'],
    landmark: 'GL Bajaj Institute Main Campus',
    landmarkHi: 'GL बजाज इंस्टिट्यूट मुख्य कैंपस'
  },
  {
    id: 'kp2-metro',
    name: 'Knowledge Park 2 Metro Station',
    nameHi: 'नॉलेज पार्क 2 मेट्रो स्टेशन',
    coordinates: { lat: 28.4791, lng: 77.4867 },
    category: 'metro',
    icon: '🚇',
    averageFare: 28,
    popularWith: ['students', 'professionals'],
    landmark: 'Aqua Line',
    landmarkHi: 'एक्वा लाइन'
  },
  {
    id: 'jaypee-hospital',
    name: 'Jaypee Hospital',
    nameHi: 'जेपी हॉस्पिटल',
    coordinates: { lat: 28.4724, lng: 77.4858 },
    category: 'hospital',
    icon: '🏥',
    averageFare: 22,
    popularWith: ['residents'],
    landmark: 'Near Pari Chowk Metro',
    landmarkHi: 'परी चौक मेट्रो के पास'
  },
  {
    id: 'greater-noida-west',
    name: 'Greater Noida West',
    nameHi: 'ग्रेटर नोएडा वेस्ट',
    coordinates: { lat: 28.4595, lng: 77.5175 },
    category: 'residential',
    icon: '🏘️',
    averageFare: 55,
    popularWith: ['professionals', 'residents'],
    landmark: 'Noida Extension Area',
    landmarkHi: 'नोएडा एक्सटेंशन एरिया'
  },
  {
    id: 'beta-sector',
    name: 'Beta Sector, Greater Noida',
    nameHi: 'बीटा सेक्टर, ग्रेटर नोएडा',
    coordinates: { lat: 28.4735, lng: 77.5102 },
    category: 'residential',
    icon: '🏘️',
    averageFare: 48,
    popularWith: ['professionals', 'residents'],
    landmark: 'Beta 1 & Beta 2',
    landmarkHi: 'बीटा 1 और बीटा 2'
  },
  {
    id: 'surajpur',
    name: 'Surajpur',
    nameHi: 'सूरजपुर',
    coordinates: { lat: 28.4823, lng: 77.5134 },
    category: 'residential',
    icon: '🏘️',
    averageFare: 52,
    popularWith: ['residents'],
    landmark: 'Residential Area',
    landmarkHi: 'आवासीय क्षेत्र'
  },
  {
    id: 'techzone-4',
    name: 'Techzone 4 IT Park',
    nameHi: 'टेकज़ोन 4 IT पार्क',
    coordinates: { lat: 28.4785, lng: 77.4945 },
    category: 'commercial',
    icon: '🏢',
    averageFare: 35,
    popularWith: ['professionals'],
    landmark: 'IT Companies, HCL, TCS Offices',
    landmarkHi: 'IT कंपनियां, HCL, TCS ऑफिस'
  }
];

/**
 * Get destinations sorted by category
 */
export function getDestinationsByCategory(category: PopularDestination['category']): PopularDestination[] {
  return PARI_CHOWK_POPULAR_DESTINATIONS.filter(dest => dest.category === category);
}

/**
 * Get destinations popular with specific user type
 */
export function getDestinationsForUserType(userType: 'students' | 'professionals' | 'residents'): PopularDestination[] {
  return PARI_CHOWK_POPULAR_DESTINATIONS.filter(dest => dest.popularWith.includes(userType));
}

/**
 * Find destination by ID
 */
export function getDestinationById(id: string): PopularDestination | undefined {
  return PARI_CHOWK_POPULAR_DESTINATIONS.find(dest => dest.id === id);
}
