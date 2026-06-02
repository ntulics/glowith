import { z } from "zod";

export const providerQuerySchema = z.object({
  category: z.enum(["Hair", "Nails", "Makeup", "Lashes", "Brows", "Barber", "Spa"]).optional(),
  q: z.string().optional()
});

export const bookingSchema = z.object({
  providerId: z.string().min(1),
  serviceId: z.string().min(1),
  clientName: z.string().min(2),
  clientEmail: z.string().email(),
  startsAt: z.string().datetime(),
  notes: z.string().optional()
});

export const messageSchema = z.object({
  providerId: z.string().min(1),
  senderRole: z.enum(["CLIENT", "PROVIDER"]),
  body: z.string().min(1).max(1000)
});
