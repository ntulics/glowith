export type ServiceCategory =
  | "Hair"
  | "Nails"
  | "Makeup"
  | "Lashes"
  | "Brows"
  | "Barber"
  | "Spa";

export type UserRole = "CLIENT" | "PROVIDER" | "ADMIN";

export type CalendarProvider = "google" | "microsoft";

export type NotificationChannel = "whatsapp" | "postmark" | "smtp2go" | "smtp";

export type PaymentProvider = "mock" | "yoco" | "peach" | "adumo" | "tap-to-pay";

export type Service = {
  id: string;
  name: string;
  category: ServiceCategory;
  durationMinutes: number;
  priceCents: number;
  depositCents: number;
};

export type PortfolioPost = {
  id: string;
  caption: string;
  image: string;
  tags: string[];
  likes: number;
  saves: number;
};

export type Provider = {
  id: string;
  handle: string;
  bookingEmail?: string;
  name: string;
  businessName: string;
  category: ServiceCategory;
  rating: number;
  reviewCount: number;
  distanceKm: number;
  location: {
    label: string;
    lat: number;
    lng: number;
  };
  verified: boolean;
  mobile: boolean;
  studio: boolean;
  nextAvailable: string;
  availableSlots?: string[];
  bio: string;
  services: Service[];
  portfolio: PortfolioPost[];
};

export type BookingStatus = "PENDING_DEPOSIT" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "EXPIRED";

export type Booking = {
  id: string;
  providerId: string;
  serviceId: string;
  clientName: string;
  clientEmail: string;
  startsAt: string;
  notes?: string;
  status: BookingStatus;
  depositCents: number;
  paymentIntentId?: string;
};

export type ConversationMessage = {
  id: string;
  providerId: string;
  senderRole: "CLIENT" | "PROVIDER";
  body: string;
  createdAt: string;
};
