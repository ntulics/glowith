/**
 * Provider amenity definitions — used in both the dashboard editor and the
 * public profile display. Icon strings map to lucide-react components at
 * render time so this file stays framework-free.
 */

export type AmenityDef = {
  key: string;
  label: string;
  icon: string;           // lucide-react component name
  /** If true, the UI renders a short text input alongside the toggle */
  hasValue?: boolean;
  valuePlaceholder?: string;
  valueSuffix?: string;
};

export type AmenityCategory = {
  key: string;
  label: string;
  amenities: AmenityDef[];
};

export const AMENITY_CATEGORIES: AmenityCategory[] = [
  {
    key: "connectivity",
    label: "Connectivity & Tech",
    amenities: [
      { key: "free_wifi", label: "Free Wi-Fi", icon: "Wifi" },
      { key: "bluetooth_speaker", label: "Bluetooth speaker / music", icon: "Music" },
      { key: "usb_charging", label: "USB charging ports", icon: "Zap" },
      { key: "smart_tv", label: "Smart TV / entertainment screen", icon: "Tv" },
      { key: "ring_light", label: "Ring light / content lighting", icon: "Sun" },
    ]
  },
  {
    key: "comfort",
    label: "Comfort & Climate",
    amenities: [
      { key: "air_conditioning", label: "Air conditioning", icon: "Wind" },
      { key: "heating", label: "Heating", icon: "Thermometer" },
      { key: "fan", label: "Fan", icon: "Wind" },
      { key: "natural_lighting", label: "Natural lighting", icon: "Sun" },
      {
        key: "avg_temperature", label: "Average indoor temperature", icon: "Thermometer",
        hasValue: true, valuePlaceholder: "e.g. 22", valueSuffix: "°C"
      },
      { key: "private_room", label: "Private room / cubicle", icon: "Lock" },
      { key: "aromatherapy", label: "Aromatherapy diffuser", icon: "Sparkles" },
      { key: "calming_music", label: "Calming background music", icon: "Music" },
      { key: "soundproofed", label: "Soundproofed space", icon: "VolumeX" },
      { key: "mood_lighting", label: "Mood / ambient lighting", icon: "Lamp" },
    ]
  },
  {
    key: "safety",
    label: "Safety & Hygiene",
    amenities: [
      { key: "first_aid_kit", label: "First aid kit", icon: "HeartPulse" },
      { key: "fire_extinguisher", label: "Fire extinguisher", icon: "Flame" },
      { key: "smoke_detector", label: "Smoke detector", icon: "BellRing" },
      { key: "cctv", label: "CCTV / Security cameras", icon: "Camera" },
      { key: "sanitization_station", label: "Sanitization station", icon: "Droplets" },
      { key: "sterilized_tools", label: "Sterilized / single-use tools", icon: "ShieldCheck" },
      { key: "uv_sterilizer", label: "UV sterilizer cabinet", icon: "Zap" },
      { key: "fresh_towels", label: "Fresh towels per client", icon: "Layers" },
      { key: "disposable_capes", label: "Disposable capes", icon: "ShieldCheck" },
      { key: "allergen_free", label: "Fragrance / allergen-free products available", icon: "Leaf" },
    ]
  },
  {
    key: "refreshments",
    label: "Refreshments",
    amenities: [
      { key: "snack_bar", label: "Snack bar", icon: "Cookie" },
      { key: "complimentary_water", label: "Complimentary water", icon: "Droplets" },
      { key: "tea_coffee", label: "Tea & coffee station", icon: "Coffee" },
      { key: "champagne", label: "Champagne / prosecco", icon: "Wine" },
      { key: "juice_smoothies", label: "Fresh juice / smoothies", icon: "GlassWater" },
      { key: "vending_machine", label: "Vending machine", icon: "Package" },
      { key: "candy_sweets", label: "Sweets / candy bowl", icon: "Candy" },
    ]
  },
  {
    key: "accessibility",
    label: "Accessibility & Transport",
    amenities: [
      { key: "wheelchair_accessible", label: "Wheelchair accessible", icon: "Accessibility" },
      { key: "elevator", label: "Elevator / lift access", icon: "ArrowUpDown" },
      { key: "dedicated_parking", label: "Dedicated parking bay", icon: "Car" },
      { key: "street_parking", label: "Street parking nearby", icon: "Car" },
      { key: "uber_friendly", label: "Easy Uber / taxi drop-off", icon: "MapPin" },
      { key: "child_friendly", label: "Child friendly", icon: "Baby" },
      { key: "pet_friendly", label: "Pet friendly", icon: "PawPrint" },
    ]
  },
  {
    key: "facilities",
    label: "Facilities",
    amenities: [
      { key: "waiting_area", label: "Waiting area / lounge", icon: "Sofa" },
      { key: "changing_room", label: "Changing room / mirror area", icon: "User" },
      { key: "bathroom", label: "Bathroom on-site", icon: "Bath" },
      { key: "shower", label: "Shower available", icon: "ShowerHead" },
      { key: "lockers", label: "Secure lockers", icon: "Lock" },
      { key: "outdoor_space", label: "Outdoor / rooftop space", icon: "TreePine" },
      { key: "photo_studio", label: "In-house photo studio", icon: "Camera" },
    ]
  },
  {
    key: "experience",
    label: "Experience & Perks",
    amenities: [
      { key: "instagram_backdrop", label: "Instagram-worthy backdrop", icon: "Camera" },
      { key: "gift_wrapping", label: "Gift wrapping / vouchers available", icon: "Gift" },
      { key: "loyalty_program", label: "Loyalty / rewards program", icon: "Award" },
      { key: "group_bookings", label: "Group bookings / hen parties", icon: "Users" },
      { key: "home_visits", label: "Home / on-location visits available", icon: "Home" },
      { key: "bridal_packages", label: "Bridal & special occasion packages", icon: "Sparkles" },
      { key: "kids_corner", label: "Kids corner / play area", icon: "Baby" },
    ]
  }
];

/** Flat lookup: key → AmenityDef */
export const AMENITY_MAP: Record<string, AmenityDef> = Object.fromEntries(
  AMENITY_CATEGORIES.flatMap((c) => c.amenities.map((a) => [a.key, a]))
);

/** All known keys, useful for validation */
export const ALL_AMENITY_KEYS = new Set(Object.keys(AMENITY_MAP));
