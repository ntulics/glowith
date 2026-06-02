import type { NotificationChannel } from "@/domain/types";

export type NotificationRequest = {
  channel: NotificationChannel;
  to: string;
  template: "booking-confirmation" | "deposit-reminder" | "message-received";
  variables: Record<string, string>;
};

export interface NotificationAdapter {
  send(request: NotificationRequest): Promise<{ id: string; status: "queued" }>;
}

export class RoutedNotificationAdapter implements NotificationAdapter {
  async send(request: NotificationRequest) {
    return {
      id: `${request.channel}_${request.template}_${Date.now()}`,
      status: "queued" as const
    };
  }
}
