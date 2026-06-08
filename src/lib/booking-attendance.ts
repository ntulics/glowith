export function generateCheckInCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function bookingEnd(startsAt: Date, durationMinutes: number) {
  return new Date(startsAt.getTime() + Math.max(1, durationMinutes) * 60000);
}

export function checkInCodeExpiry(startsAt: Date, durationMinutes: number) {
  return new Date(bookingEnd(startsAt, durationMinutes).getTime() + 2 * 60 * 60 * 1000);
}

export function messageWindowOpen(params: {
  startsAt: Date;
  durationMinutes: number;
  status: string;
  completedAt?: Date | null;
  noShowAt?: Date | null;
}) {
  if (params.noShowAt) return false;
  const now = Date.now();
  const end = bookingEnd(params.startsAt, params.durationMinutes).getTime();
  if (params.status === "CONFIRMED" && end >= now) return true;
  if (params.status === "COMPLETED" && params.completedAt) {
    return now <= params.completedAt.getTime() + 24 * 60 * 60 * 1000;
  }
  return false;
}
