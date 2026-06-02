import { messages, providers } from "@/domain/seed";
import type { Booking, ConversationMessage, ServiceCategory } from "@/domain/types";

const bookings: Booking[] = [];
const mutableMessages: ConversationMessage[] = [...messages];

export function listProviders(filters?: { category?: ServiceCategory; q?: string }) {
  return providers.filter((provider) => {
    const matchesCategory = !filters?.category || provider.category === filters.category;
    const query = filters?.q?.trim().toLowerCase();
    const matchesQuery =
      !query ||
      [provider.name, provider.businessName, provider.handle, provider.bio, provider.location.label]
        .join(" ")
        .toLowerCase()
        .includes(query);

    return matchesCategory && matchesQuery;
  });
}

export function getProvider(id: string) {
  return providers.find((provider) => provider.id === id);
}

export function createBooking(input: Omit<Booking, "id" | "status">) {
  const booking: Booking = {
    ...input,
    id: `book_${Date.now()}`,
    status: "PENDING_DEPOSIT"
  };
  bookings.push(booking);
  return booking;
}

export function listBookings() {
  return bookings;
}

export function listMessages(providerId?: string) {
  return providerId ? mutableMessages.filter((message) => message.providerId === providerId) : mutableMessages;
}

export function createMessage(input: Omit<ConversationMessage, "id" | "createdAt">) {
  const message: ConversationMessage = {
    ...input,
    id: `msg_${Date.now()}`,
    createdAt: new Date().toISOString()
  };
  mutableMessages.unshift(message);
  return message;
}
