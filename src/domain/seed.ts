import type { ConversationMessage, Provider } from "./types";

const portfolioImages = [
  "/images/glowith-hero.png",
  "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=900&q=80"
];

export const providers: Provider[] = [
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
      { id: "post_1", caption: "Soft layers and copper gloss", image: portfolioImages[0], tags: ["color", "silkpress"], likes: 421, saves: 88 },
      { id: "post_2", caption: "Bridal prep trial", image: portfolioImages[1], tags: ["bridal", "finish"], likes: 318, saves: 52 }
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
      { id: "post_3", caption: "Champagne soft glam", image: portfolioImages[1], tags: ["softglam", "bridal"], likes: 263, saves: 71 },
      { id: "post_4", caption: "Editorial liner", image: portfolioImages[0], tags: ["editorial"], likes: 191, saves: 31 }
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
      { id: "post_5", caption: "Chrome almond set", image: portfolioImages[2], tags: ["chrome", "gel"], likes: 382, saves: 109 },
      { id: "post_6", caption: "Micro floral detail", image: portfolioImages[3], tags: ["nailart"], likes: 244, saves: 66 }
    ]
  },
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
      { id: "post_demo_1", caption: "Demo salon hero look", image: portfolioImages[0], tags: ["demo", "hair"], likes: 128, saves: 34 },
      { id: "post_demo_2", caption: "Soft glam demo portfolio", image: portfolioImages[1], tags: ["demo", "makeup"], likes: 96, saves: 21 },
      { id: "post_demo_3", caption: "Gel set demo portfolio", image: portfolioImages[2], tags: ["demo", "nails"], likes: 142, saves: 48 }
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
