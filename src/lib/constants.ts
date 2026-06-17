// Emission factors in kg CO2e per unit (ISO-14064 based)
export const EMISSION_FACTORS = {
  transport: {
    car_petrol_per_km: 0.192,
    car_diesel_per_km: 0.171,
    car_ev_per_km: 0.053,
    bus_per_km: 0.089,
    train_per_km: 0.041,
    subway_per_km: 0.033,
    flight_short_per_km: 0.255, // <1500km
    flight_long_per_km: 0.195,  // >1500km
    motorcycle_per_km: 0.103,
    bike_per_km: 0,
    walk_per_km: 0,
  },
  food: {
    red_meat_per_kg: 27,
    lamb_per_kg: 39.2,
    pork_per_kg: 12.1,
    chicken_per_kg: 6.9,
    fish_per_kg: 6.1,
    dairy_per_kg: 3.2,
    eggs_per_kg: 4.8,
    vegetables_per_kg: 0.86,
    fruits_per_kg: 0.7,
    grains_per_kg: 0.65,
    legumes_per_kg: 0.43,
    nuts_per_kg: 2.3,
    plant_based_meal: 0.5,
    mixed_meal: 1.5,
    meat_heavy_meal: 3.2,
    vegan_meal: 0.4,
  },
  energy: {
    electricity_per_kwh: 0.233, // UK grid average
    natural_gas_per_kwh: 0.202,
    heating_oil_per_litre: 2.52,
    coal_per_kg: 2.42,
    lpg_per_kg: 1.51,
    renewable_per_kwh: 0.011,
  },
  lifestyle: {
    clothing_item: 10,
    electronics_smartphone: 70,
    electronics_laptop: 300,
    streaming_per_hour: 0.036,
    video_call_per_hour: 0.01,
    hotel_night_per_night: 31.5,
    ac_per_hour: 0.8,
    shower_10min: 0.06,
    bath: 0.3,
    laundry_load: 0.6,
  },
} as const

export const CATEGORY_ICONS = {
  transport: 'commute',
  food: 'restaurant',
  energy: 'bolt',
  lifestyle: 'home',
  other: 'more_horiz',
} as const

export const CATEGORY_COLORS = {
  transport: 'primary',
  food: 'tertiary',
  energy: 'error',
  lifestyle: 'secondary',
  other: 'outline',
} as const

export const CARBON_SCORE_THRESHOLDS = {
  excellent: 85,
  good: 70,
  fair: 55,
  poor: 40,
} as const

export const WEEKLY_GLOBAL_AVERAGE_KG = 200 // ~10.4t/yr / 52 weeks
export const WEEKLY_EU_AVERAGE_KG = 150
export const WEEKLY_TARGET_KG = 46 // ~2.4t/yr Paris Agreement target

export const APP_NAME = 'Rootly'
export const APP_VERSION = '1.0.0'
export const APP_DESCRIPTION = 'AI-powered carbon footprint sustainability coach'

export const ROUTES = {
  HOME: '/',
  SIGN_IN: '/auth/signin',
  SIGN_UP: '/auth/signup',
  DASHBOARD: '/dashboard',
  COACH: '/coach',
  VOICE: '/voice',
  ACTIVITY: '/activity',
  ROUTES: '/routes',
  INSIGHTS: '/insights',
  REPORTS: '/reports',
  GOALS: '/goals',
  PROFILE: '/profile',
  EXPORTS: '/exports',
} as const

export const NAV_ITEMS = [
  { label: 'Home', href: ROUTES.DASHBOARD, icon: 'home' },
  { label: 'Coach', href: ROUTES.COACH, icon: 'psychology' },
  { label: 'Voice', href: ROUTES.VOICE, icon: 'mic' },
  { label: 'Activity', href: ROUTES.ACTIVITY, icon: 'edit_note' },
  { label: 'Routes', href: ROUTES.ROUTES, icon: 'route' },
  { label: 'Reports', href: ROUTES.REPORTS, icon: 'analytics' },
  { label: 'Goals', href: ROUTES.GOALS, icon: 'track_changes' },
] as const
