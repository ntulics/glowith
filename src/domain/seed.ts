import type { ConversationMessage, Provider } from "./types";

const img = [
  "/images/glowith-hero.png",
  "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=900&q=80",
  "/images/glowith-hero.png",
  "/images/glowith-hero.png",
  "/images/glowith-hero.png"
];

export const providers: Provider[] = [

  // ── Johannesburg ───────────────────────────────────────────

  {
    id: "pro_lumelocks",
    handle: "@lumelocks",
    name: "Naledi Mokoena",
    businessName: "Lume Locks Studio",
    category: "Hair",
    rating: 4.9,
    reviewCount: 184,
    distanceKm: 2.4,
    location: { label: "Rosebank, Johannesburg", lat: -26.1458, lng: 28.042 },
    verified: true,
    mobile: false,
    studio: true,
    nextAvailable: "Today 15:30",
    availableSlots: ["09:00", "12:30", "15:30"],
    bio: "Color, silk press, protective styling, and event hair with a calm studio experience.",
    services: [
      { id: "svc_silk", name: "Silk press", category: "Hair", durationMinutes: 90, priceCents: 85000, depositCents: 25000 },
      { id: "svc_color", name: "Gloss color refresh", category: "Hair", durationMinutes: 120, priceCents: 125000, depositCents: 35000 }
    ],
    portfolio: [
      { id: "post_1", caption: "Soft layers and copper gloss", image: img[0], tags: ["color", "silkpress"], likes: 421, saves: 88 },
      { id: "post_2", caption: "Bridal prep trial", image: img[1], tags: ["bridal", "finish"], likes: 318, saves: 52 }
    ]
  },

  {
    id: "pro_canvas",
    handle: "@canvasbyzara",
    name: "Zara Patel",
    businessName: "Canvas Makeup Bar",
    category: "Makeup",
    rating: 4.8,
    reviewCount: 96,
    distanceKm: 4.1,
    location: { label: "Sandton, Johannesburg", lat: -26.1076, lng: 28.0567 },
    verified: true,
    mobile: true,
    studio: true,
    nextAvailable: "Tomorrow 09:00",
    availableSlots: ["09:00", "11:30", "14:00"],
    bio: "Soft glam, editorial looks, and bridal parties with mobile call-out options.",
    services: [
      { id: "svc_soft_glam", name: "Soft glam", category: "Makeup", durationMinutes: 60, priceCents: 70000, depositCents: 20000 },
      { id: "svc_bridal", name: "Bridal trial", category: "Makeup", durationMinutes: 90, priceCents: 110000, depositCents: 30000 }
    ],
    portfolio: [
      { id: "post_3", caption: "Champagne soft glam", image: img[1], tags: ["softglam", "bridal"], likes: 263, saves: 71 },
      { id: "post_4", caption: "Editorial liner", image: img[0], tags: ["editorial"], likes: 191, saves: 31 }
    ]
  },

  {
    id: "pro_nailroom",
    handle: "@nailroomsa",
    name: "Boitumelo Dlamini",
    businessName: "The Nail Room",
    category: "Nails",
    rating: 4.7,
    reviewCount: 142,
    distanceKm: 1.8,
    location: { label: "Parkhurst, Johannesburg", lat: -26.1383, lng: 28.0174 },
    verified: false,
    mobile: false,
    studio: true,
    nextAvailable: "Fri 12:00",
    availableSlots: ["10:00", "12:00", "16:30"],
    bio: "Structured gel, fine-line nail art, overlays, and quick repairs.",
    services: [
      { id: "svc_gel", name: "Structured gel set", category: "Nails", durationMinutes: 75, priceCents: 52000, depositCents: 15000 },
      { id: "svc_art", name: "Detailed nail art add-on", category: "Nails", durationMinutes: 30, priceCents: 18000, depositCents: 5000 }
    ],
    portfolio: [
      { id: "post_5", caption: "Chrome almond set", image: img[2], tags: ["chrome", "gel"], likes: 382, saves: 109 },
      { id: "post_6", caption: "Micro floral detail", image: img[3], tags: ["nailart"], likes: 244, saves: 66 }
    ]
  },

  {
    id: "pro_browbar_jhb",
    handle: "@browbar_jhb",
    name: "Sipho Nkosi",
    businessName: "The Brow Bar JHB",
    category: "Brows",
    rating: 4.9,
    reviewCount: 203,
    distanceKm: 3.2,
    location: { label: "Melrose Arch, Johannesburg", lat: -26.1328, lng: 28.0659 },
    verified: true,
    mobile: false,
    studio: true,
    nextAvailable: "Today 11:00",
    availableSlots: ["09:00", "11:00", "13:30", "16:00"],
    bio: "Precision brow shaping, lamination, tinting, and microblading consultations.",
    services: [
      { id: "svc_lam", name: "Brow lamination", category: "Brows", durationMinutes: 60, priceCents: 55000, depositCents: 15000 },
      { id: "svc_tint", name: "Shape & tint", category: "Brows", durationMinutes: 30, priceCents: 28000, depositCents: 8000 }
    ],
    portfolio: [
      { id: "post_brow1", caption: "Fluffy laminated brows", image: img[4], tags: ["lamination", "brows"], likes: 511, saves: 143 },
      { id: "post_brow2", caption: "Natural arch definition", image: img[5], tags: ["tint", "shape"], likes: 289, saves: 77 }
    ]
  },

  {
    id: "pro_luxelashes",
    handle: "@luxelashes_jhb",
    name: "Thandeka Sithole",
    businessName: "Luxe Lash Studio",
    category: "Lashes",
    rating: 4.8,
    reviewCount: 117,
    distanceKm: 5.6,
    location: { label: "Fourways, Johannesburg", lat: -26.0209, lng: 28.0101 },
    verified: true,
    mobile: false,
    studio: true,
    nextAvailable: "Tomorrow 10:00",
    availableSlots: ["10:00", "13:00", "15:30"],
    bio: "Classic, hybrid, and volume lash sets. Infills every 2–3 weeks.",
    services: [
      { id: "svc_classic_lash", name: "Classic full set", category: "Lashes", durationMinutes: 90, priceCents: 75000, depositCents: 20000 },
      { id: "svc_volume_lash", name: "Volume full set", category: "Lashes", durationMinutes: 120, priceCents: 95000, depositCents: 25000 },
      { id: "svc_infill", name: "Lash infill (2 weeks)", category: "Lashes", durationMinutes: 60, priceCents: 45000, depositCents: 12000 }
    ],
    portfolio: [
      { id: "post_lash1", caption: "Wispy hybrid set", image: img[6], tags: ["hybrid", "lashes"], likes: 394, saves: 102 },
      { id: "post_lash2", caption: "Mega volume", image: img[7], tags: ["volume"], likes: 277, saves: 64 }
    ]
  },

  {
    id: "pro_barberking",
    handle: "@barberkingsa",
    name: "Lethiwe Khoza",
    businessName: "Barber King",
    category: "Barber",
    rating: 4.7,
    reviewCount: 321,
    distanceKm: 7.2,
    location: { label: "Soweto, Johannesburg", lat: -26.2677, lng: 27.8591 },
    verified: true,
    mobile: false,
    studio: true,
    nextAvailable: "Today 14:00",
    availableSlots: ["08:00", "10:00", "12:00", "14:00", "16:00"],
    bio: "Classic fades, line-ups, beard sculpting, and hot towel treatments.",
    services: [
      { id: "svc_fade", name: "Skin fade", category: "Barber", durationMinutes: 45, priceCents: 22000, depositCents: 5000 },
      { id: "svc_beard", name: "Beard shape & line-up", category: "Barber", durationMinutes: 30, priceCents: 15000, depositCents: 4000 },
      { id: "svc_combo", name: "Cut + beard combo", category: "Barber", durationMinutes: 70, priceCents: 32000, depositCents: 8000 }
    ],
    portfolio: [
      { id: "post_barber1", caption: "Clean skin fade", image: img[3], tags: ["fade", "barber"], likes: 617, saves: 182 },
      { id: "post_barber2", caption: "Beard sculpt", image: img[2], tags: ["beard"], likes: 388, saves: 91 }
    ]
  },

  {
    id: "pro_spafleur",
    handle: "@spafleur",
    name: "Amara Osei",
    businessName: "Spa Fleur",
    category: "Spa",
    rating: 4.9,
    reviewCount: 88,
    distanceKm: 6.3,
    location: { label: "Bryanston, Johannesburg", lat: -26.0561, lng: 28.0205 },
    verified: true,
    mobile: false,
    studio: true,
    nextAvailable: "Sat 10:00",
    availableSlots: ["10:00", "12:00", "14:00"],
    bio: "Full-body massages, facials, hot stone therapy, and aromatherapy treatments.",
    services: [
      { id: "svc_swedish", name: "Swedish massage (60 min)", category: "Spa", durationMinutes: 60, priceCents: 90000, depositCents: 25000 },
      { id: "svc_facial", name: "Hydrating facial", category: "Spa", durationMinutes: 75, priceCents: 85000, depositCents: 20000 }
    ],
    portfolio: [
      { id: "post_spa1", caption: "Relaxation suite setup", image: img[0], tags: ["spa", "massage"], likes: 199, saves: 58 },
      { id: "post_spa2", caption: "Hot stone therapy", image: img[1], tags: ["hotstone"], likes: 143, saves: 40 }
    ]
  },

  {
    id: "pro_jhb_barber2",
    handle: "@thecutjhb",
    name: "Karabo Sithole",
    businessName: "The Cut JHB",
    category: "Barber",
    rating: 4.6,
    reviewCount: 189,
    distanceKm: 4.8,
    location: { label: "Norwood, Johannesburg", lat: -26.1544, lng: 28.0702 },
    verified: false,
    mobile: false,
    studio: true,
    nextAvailable: "Tomorrow 08:00",
    availableSlots: ["08:00", "10:30", "13:00", "15:30"],
    bio: "Fades, designs, and Afro trims. Walk-ins and bookings. Great for lunchtime appointments.",
    services: [
      { id: "svc_tcut_fade", name: "Fade & design", category: "Barber", durationMinutes: 50, priceCents: 25000, depositCents: 6000 },
      { id: "svc_tcut_trim", name: "Afro trim", category: "Barber", durationMinutes: 30, priceCents: 14000, depositCents: 3500 }
    ],
    portfolio: [
      { id: "post_tcut1", caption: "Low fade + line design", image: img[2], tags: ["fade", "design"], likes: 302, saves: 87 },
      { id: "post_tcut2", caption: "Clean Afro shape", image: img[3], tags: ["afro"], likes: 198, saves: 51 }
    ]
  },

  // ── Pretoria ───────────────────────────────────────────────

  {
    id: "pro_pta_hair",
    handle: "@queencuts_pta",
    name: "Refilwe Tau",
    businessName: "Queen Cuts Pretoria",
    category: "Hair",
    rating: 4.6,
    reviewCount: 74,
    distanceKm: 48.2,
    location: { label: "Sunnyside, Pretoria", lat: -25.7479, lng: 28.2293 },
    verified: true,
    mobile: false,
    studio: true,
    nextAvailable: "Tomorrow 10:00",
    availableSlots: ["09:00", "11:00", "14:00"],
    bio: "Relaxers, braids, weaves, and natural hair styling for all textures.",
    services: [
      { id: "svc_pta_weave", name: "Full weave install", category: "Hair", durationMinutes: 180, priceCents: 150000, depositCents: 40000 },
      { id: "svc_pta_braids", name: "Knotless braids", category: "Hair", durationMinutes: 240, priceCents: 130000, depositCents: 35000 }
    ],
    portfolio: [
      { id: "post_pta_h1", caption: "Sleek straight weave", image: img[2], tags: ["weave", "straight"], likes: 281, saves: 73 },
      { id: "post_pta_h2", caption: "Long knotless braids", image: img[3], tags: ["braids", "protective"], likes: 344, saves: 97 }
    ]
  },

  {
    id: "pro_pta_nails",
    handle: "@nailhaven_pta",
    name: "Chantelle du Plessis",
    businessName: "Nail Haven",
    category: "Nails",
    rating: 4.8,
    reviewCount: 109,
    distanceKm: 51.0,
    location: { label: "Hatfield, Pretoria", lat: -25.7485, lng: 28.2383 },
    verified: true,
    mobile: true,
    studio: false,
    nextAvailable: "Today 16:00",
    availableSlots: ["10:00", "13:00", "16:00"],
    bio: "Mobile nail tech specialising in gel, acrylic, and press-on sets. I come to you.",
    services: [
      { id: "svc_pta_gel", name: "Full gel set", category: "Nails", durationMinutes: 90, priceCents: 48000, depositCents: 12000 },
      { id: "svc_pta_acrylic", name: "Acrylic full set", category: "Nails", durationMinutes: 90, priceCents: 55000, depositCents: 15000 }
    ],
    portfolio: [
      { id: "post_pta_n1", caption: "Pink ombre almond", image: img[5], tags: ["ombre", "gel"], likes: 198, saves: 55 },
      { id: "post_pta_n2", caption: "Black marble acrylic", image: img[4], tags: ["marble", "acrylic"], likes: 271, saves: 78 }
    ]
  },

  {
    id: "pro_pta_spa",
    handle: "@serenespa_pta",
    name: "Fatima Hendricks",
    businessName: "Serene Spa & Wellness",
    category: "Spa",
    rating: 4.9,
    reviewCount: 62,
    distanceKm: 49.5,
    location: { label: "Menlyn, Pretoria", lat: -25.7820, lng: 28.2767 },
    verified: true,
    mobile: false,
    studio: true,
    nextAvailable: "Sat 09:00",
    availableSlots: ["09:00", "11:00", "13:00", "15:00"],
    bio: "Luxury wellness treatments including deep tissue, reflexology, and couples packages.",
    services: [
      { id: "svc_pta_deep", name: "Deep tissue massage (90 min)", category: "Spa", durationMinutes: 90, priceCents: 120000, depositCents: 30000 },
      { id: "svc_pta_reflex", name: "Foot reflexology", category: "Spa", durationMinutes: 45, priceCents: 55000, depositCents: 15000 }
    ],
    portfolio: [
      { id: "post_pta_s1", caption: "Treatment room vibes", image: img[6], tags: ["spa", "relaxation"], likes: 155, saves: 42 },
      { id: "post_pta_s2", caption: "Couples retreat setup", image: img[7], tags: ["couples", "wellness"], likes: 201, saves: 67 }
    ]
  },

  {
    id: "pro_pta_makeup",
    handle: "@facesbyleo_pta",
    name: "Leona Ferreira",
    businessName: "Faces by Leo",
    category: "Makeup",
    rating: 4.7,
    reviewCount: 55,
    distanceKm: 52.3,
    location: { label: "Arcadia, Pretoria", lat: -25.7461, lng: 28.2170 },
    verified: false,
    mobile: true,
    studio: true,
    nextAvailable: "Fri 09:00",
    availableSlots: ["09:00", "11:00", "14:00"],
    bio: "Matric, wedding, and corporate makeup for all skin tones. Airbrush available.",
    services: [
      { id: "svc_pta_airbrush", name: "Airbrush full glam", category: "Makeup", durationMinutes: 75, priceCents: 85000, depositCents: 22000 },
      { id: "svc_pta_natural", name: "Natural day look", category: "Makeup", durationMinutes: 45, priceCents: 45000, depositCents: 12000 }
    ],
    portfolio: [
      { id: "post_pta_m1", caption: "Airbrush bridal finish", image: img[1], tags: ["airbrush", "bridal"], likes: 234, saves: 66 },
      { id: "post_pta_m2", caption: "Corporate natural glam", image: img[0], tags: ["natural", "corporate"], likes: 171, saves: 43 }
    ]
  },

  // ── eMalahleni / Duvha Park ────────────────────────────────

  {
    id: "pro_duvha_hair",
    handle: "@glowcuts_duvha",
    name: "Precious Mahlangu",
    businessName: "Glow Cuts Duvha Park",
    category: "Hair",
    rating: 4.7,
    reviewCount: 53,
    distanceKm: 138.4,
    location: { label: "Duvha Park, eMalahleni", lat: -25.8831, lng: 29.2278 },
    verified: true,
    mobile: false,
    studio: true,
    nextAvailable: "Today 13:00",
    availableSlots: ["09:00", "11:00", "13:00", "15:00"],
    bio: "Hair relaxing, colour, box braids, and weaves. Walk-ins welcome at Duvha Park.",
    services: [
      { id: "svc_duvha_relax", name: "Relaxer & blowout", category: "Hair", durationMinutes: 120, priceCents: 65000, depositCents: 18000 },
      { id: "svc_duvha_box", name: "Box braids (medium)", category: "Hair", durationMinutes: 210, priceCents: 95000, depositCents: 25000 }
    ],
    portfolio: [
      { id: "post_duvha_h1", caption: "Sleek blowout finish", image: img[1], tags: ["blowout", "relaxer"], likes: 167, saves: 44 },
      { id: "post_duvha_h2", caption: "Medium box braids", image: img[2], tags: ["braids", "natural"], likes: 223, saves: 61 }
    ]
  },

  {
    id: "pro_duvha_nails",
    handle: "@nailsbysihle",
    name: "Sihle Ndlovu",
    businessName: "Nails by Sihle",
    category: "Nails",
    rating: 4.8,
    reviewCount: 41,
    distanceKm: 140.1,
    location: { label: "Duvha Park, eMalahleni", lat: -25.8855, lng: 29.2301 },
    verified: false,
    mobile: true,
    studio: false,
    nextAvailable: "Tomorrow 11:00",
    availableSlots: ["11:00", "13:00", "15:00"],
    bio: "Mobile nail services in and around Duvha Park. Gel, builder gel, and nail art.",
    services: [
      { id: "svc_duvha_gel", name: "Builder gel set", category: "Nails", durationMinutes: 90, priceCents: 45000, depositCents: 12000 },
      { id: "svc_duvha_art", name: "Nail art (per nail)", category: "Nails", durationMinutes: 15, priceCents: 3500, depositCents: 1000 }
    ],
    portfolio: [
      { id: "post_duvha_n1", caption: "Nude builder gel set", image: img[4], tags: ["buildergel", "nude"], likes: 132, saves: 38 },
      { id: "post_duvha_n2", caption: "Pastel spring nails", image: img[5], tags: ["art", "pastel"], likes: 188, saves: 52 }
    ]
  },

  {
    id: "pro_emalahleni_barber",
    handle: "@freshcuts_emalahleni",
    name: "Tebogo Mabunda",
    businessName: "Fresh Cuts eMalahleni",
    category: "Barber",
    rating: 4.6,
    reviewCount: 88,
    distanceKm: 136.9,
    location: { label: "Highveld, eMalahleni", lat: -25.8741, lng: 29.2415 },
    verified: true,
    mobile: false,
    studio: true,
    nextAvailable: "Today 15:00",
    availableSlots: ["08:00", "10:00", "12:00", "15:00", "17:00"],
    bio: "Fades, line-ups, beard trims, and Afro styling. Walk-ins and bookings welcome.",
    services: [
      { id: "svc_emala_fade", name: "Taper fade", category: "Barber", durationMinutes: 40, priceCents: 18000, depositCents: 5000 },
      { id: "svc_emala_afro", name: "Afro shape-up", category: "Barber", durationMinutes: 30, priceCents: 12000, depositCents: 3000 }
    ],
    portfolio: [
      { id: "post_emala_b1", caption: "Clean taper fade", image: img[3], tags: ["fade", "taper"], likes: 244, saves: 69 },
      { id: "post_emala_b2", caption: "Afro round shape", image: img[0], tags: ["afro"], likes: 178, saves: 45 }
    ]
  },

  {
    id: "pro_emalahleni_makeup",
    handle: "@glamsuite_emalahleni",
    name: "Nomvula Shabalala",
    businessName: "Glam Suite eMalahleni",
    category: "Makeup",
    rating: 4.7,
    reviewCount: 34,
    distanceKm: 137.5,
    location: { label: "Duvha Park, eMalahleni", lat: -25.8920, lng: 29.2190 },
    verified: false,
    mobile: true,
    studio: true,
    nextAvailable: "Fri 10:00",
    availableSlots: ["10:00", "12:00", "14:00"],
    bio: "Event glam, matric farewell, and wedding makeup. Mobile available across eMalahleni.",
    services: [
      { id: "svc_emala_glam", name: "Full glam", category: "Makeup", durationMinutes: 75, priceCents: 60000, depositCents: 15000 },
      { id: "svc_emala_matric", name: "Matric farewell look", category: "Makeup", durationMinutes: 60, priceCents: 55000, depositCents: 15000 }
    ],
    portfolio: [
      { id: "post_emala_m1", caption: "Matric farewell glam", image: img[7], tags: ["matric", "glam"], likes: 291, saves: 84 },
      { id: "post_emala_m2", caption: "Smokey bridal look", image: img[6], tags: ["bridal", "smokey"], likes: 198, saves: 53 }
    ]
  },

  {
    id: "pro_emalahleni_lashes",
    handle: "@lashlove_emalahleni",
    name: "Dineo Moagi",
    businessName: "Lash Love Studio",
    category: "Lashes",
    rating: 4.9,
    reviewCount: 29,
    distanceKm: 139.2,
    location: { label: "Duvha Park, eMalahleni", lat: -25.8870, lng: 29.2320 },
    verified: true,
    mobile: false,
    studio: true,
    nextAvailable: "Tomorrow 09:00",
    availableSlots: ["09:00", "11:00", "14:00"],
    bio: "Lash extensions, lifts, and tints. Serving Duvha Park and surrounding areas.",
    services: [
      { id: "svc_emala_lift", name: "Lash lift & tint", category: "Lashes", durationMinutes: 60, priceCents: 42000, depositCents: 10000 },
      { id: "svc_emala_classic", name: "Classic lash set", category: "Lashes", durationMinutes: 90, priceCents: 65000, depositCents: 18000 }
    ],
    portfolio: [
      { id: "post_emala_l1", caption: "Natural lash lift", image: img[5], tags: ["lift", "tint"], likes: 143, saves: 39 },
      { id: "post_emala_l2", caption: "Classic full set", image: img[4], tags: ["classic", "lashes"], likes: 211, saves: 58 }
    ]
  },

  // ── Cape Town ──────────────────────────────────────────────

  {
    id: "pro_ct_brows",
    handle: "@browsbyisabella",
    name: "Isabella Steyn",
    businessName: "Brows by Isabella",
    category: "Brows",
    rating: 4.9,
    reviewCount: 157,
    distanceKm: 1397.0,
    location: { label: "Sea Point, Cape Town", lat: -33.9226, lng: 18.3817 },
    verified: true,
    mobile: false,
    studio: true,
    nextAvailable: "Tomorrow 09:30",
    availableSlots: ["09:00", "11:30", "14:00"],
    bio: "Brow mapping, lamination, tinting, and microblading by a certified artist in Sea Point.",
    services: [
      { id: "svc_ct_lam", name: "Brow lamination & tint", category: "Brows", durationMinutes: 60, priceCents: 65000, depositCents: 18000 },
      { id: "svc_ct_micro", name: "Microblading consultation", category: "Brows", durationMinutes: 90, priceCents: 250000, depositCents: 75000 }
    ],
    portfolio: [
      { id: "post_ct_b1", caption: "Bold laminated brows", image: img[4], tags: ["lamination", "bold"], likes: 412, saves: 121 },
      { id: "post_ct_b2", caption: "Soft feathered brows", image: img[5], tags: ["feather", "natural"], likes: 302, saves: 88 }
    ]
  },

  {
    id: "pro_ct_hair",
    handle: "@saltairhair_ct",
    name: "Mia Jacobs",
    businessName: "Salt Air Hair",
    category: "Hair",
    rating: 4.8,
    reviewCount: 211,
    distanceKm: 1401.0,
    location: { label: "Green Point, Cape Town", lat: -33.9060, lng: 18.4037 },
    verified: true,
    mobile: false,
    studio: true,
    nextAvailable: "Today 12:00",
    availableSlots: ["09:00", "12:00", "15:00"],
    bio: "Balayage specialists, textured cuts, and lived-in colour in a relaxed studio.",
    services: [
      { id: "svc_ct_balay", name: "Full balayage", category: "Hair", durationMinutes: 180, priceCents: 195000, depositCents: 55000 },
      { id: "svc_ct_cut", name: "Cut & blow-dry", category: "Hair", durationMinutes: 60, priceCents: 75000, depositCents: 20000 }
    ],
    portfolio: [
      { id: "post_ct_h1", caption: "Beachy balayage", image: img[1], tags: ["balayage", "beachy"], likes: 534, saves: 156 },
      { id: "post_ct_h2", caption: "Textured bob", image: img[2], tags: ["bob", "texture"], likes: 321, saves: 89 }
    ]
  },

  // ── Demo provider ──────────────────────────────────────────

  {
    id: "pro_glowith_demo",
    handle: "@demo",
    bookingEmail: "bookings@demo.glowith.co.za",
    name: "Glowith Demo Stylist",
    businessName: "Glowith Demo Salon",
    category: "Hair",
    rating: 4.9,
    reviewCount: 58,
    distanceKm: 2.2,
    location: { label: "Rosebank, Johannesburg", lat: -26.1458, lng: 28.042 },
    verified: true,
    mobile: true,
    studio: true,
    nextAvailable: "Today 14:00",
    availableSlots: ["09:00", "12:30", "15:30", "17:00"],
    bio: "Seeded salon for product demos, booking flows, dashboard testing, and marketplace walkthroughs.",
    services: [
      { id: "svc_demo_silk", name: "Demo silk press", category: "Hair", durationMinutes: 90, priceCents: 85000, depositCents: 25000 },
      { id: "svc_demo_color", name: "Demo colour gloss", category: "Hair", durationMinutes: 120, priceCents: 125000, depositCents: 35000 },
      { id: "svc_demo_gel", name: "Demo gel manicure", category: "Nails", durationMinutes: 75, priceCents: 52000, depositCents: 15000 },
      { id: "svc_demo_glam", name: "Demo bridal soft glam", category: "Makeup", durationMinutes: 60, priceCents: 70000, depositCents: 20000 }
    ],
    portfolio: [
      { id: "post_demo_1", caption: "Demo salon hero look", image: img[0], tags: ["demo", "hair"], likes: 128, saves: 34 },
      { id: "post_demo_2", caption: "Soft glam demo portfolio", image: img[1], tags: ["demo", "makeup"], likes: 96, saves: 21 },
      { id: "post_demo_3", caption: "Gel set demo portfolio", image: img[2], tags: ["demo", "nails"], likes: 142, saves: 48 }
    ]
  }
];

export const messages: ConversationMessage[] = [
  {
    id: "msg_1",
    providerId: "pro_lumelocks",
    senderRole: "PROVIDER",
    body: "I can do a strand test before color if you want to come in 15 minutes early.",
    createdAt: new Date(Date.now() - 1000 * 60 * 22).toISOString()
  },
  {
    id: "msg_2",
    providerId: "pro_canvas",
    senderRole: "CLIENT",
    body: "Do you travel for two bridesmaids in Rosebank?",
    createdAt: new Date(Date.now() - 1000 * 60 * 44).toISOString()
  }
];
