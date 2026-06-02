import type { Booking, CalendarProvider } from "@/domain/types";

export type CalendarSyncResult = {
  provider: CalendarProvider;
  externalEventId: string;
  status: "queued" | "synced";
};

export interface CalendarAdapter {
  provider: CalendarProvider;
  syncBooking(booking: Booking): Promise<CalendarSyncResult>;
}

class GoogleCalendarAdapter implements CalendarAdapter {
  provider: CalendarProvider = "google";

  async syncBooking(booking: Booking) {
    return {
      provider: this.provider,
      externalEventId: `gcal_${booking.id}`,
      status: "queued" as const
    };
  }
}

class MicrosoftCalendarAdapter implements CalendarAdapter {
  provider: CalendarProvider = "microsoft";

  async syncBooking(booking: Booking) {
    return {
      provider: this.provider,
      externalEventId: `msgraph_${booking.id}`,
      status: "queued" as const
    };
  }
}

export function getCalendarAdapter(provider: CalendarProvider): CalendarAdapter {
  return provider === "microsoft" ? new MicrosoftCalendarAdapter() : new GoogleCalendarAdapter();
}
