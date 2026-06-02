"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks, parseISO } from "date-fns";

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 08:00–20:00

type Booking = {
  id: string; clientName: string; service: string;
  durationMinutes: number; startsAt: string; status: string; color: string;
};

export function CalendarView({ bookings }: { bookings: Booking[] }) {
  const [week, setWeek] = useState(new Date());
  const weekStart = startOfWeek(week, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function bookingsForDay(day: Date) {
    return bookings.filter((b) => isSameDay(parseISO(b.startsAt), day));
  }

  return (
    <div className="flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <h1 className="text-xl font-black">Calendar</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeek(subWeeks(week, 1))} className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[160px] text-center text-sm font-bold">
            {format(weekStart, "d MMM")} – {format(addDays(weekStart, 6), "d MMM yyyy")}
          </span>
          <button onClick={() => setWeek(addWeeks(week, 1))} className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={() => setWeek(new Date())} className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-semibold hover:bg-gray-50">
            Today
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden bg-white">
        {/* Time column */}
        <div className="w-16 shrink-0 border-r border-gray-100">
          <div className="h-12 border-b border-gray-100" />
          {HOURS.map((h) => (
            <div key={h} className="relative h-16 border-b border-gray-50">
              <span className="absolute -top-2 right-2 text-[10px] text-gray-400">{h}:00</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div className="flex flex-1 overflow-x-auto">
          {days.map((day) => {
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toISOString()} className="flex min-w-[120px] flex-1 flex-col border-r border-gray-100 last:border-r-0">
                {/* Day header */}
                <div className="flex h-12 flex-col items-center justify-center border-b border-gray-100">
                  <p className="text-[10px] font-semibold uppercase text-gray-400">{format(day, "EEE")}</p>
                  <p className={`text-sm font-black ${isToday ? "flex h-6 w-6 items-center justify-center rounded-full bg-[#D94472] text-white" : ""}`}>
                    {format(day, "d")}
                  </p>
                </div>

                {/* Time grid */}
                <div className="relative flex-1">
                  {HOURS.map((h) => (
                    <div key={h} className="h-16 border-b border-gray-50" />
                  ))}

                  {/* Bookings */}
                  {bookingsForDay(day).map((b) => {
                    const start = parseISO(b.startsAt);
                    const startHour = start.getHours() + start.getMinutes() / 60;
                    const top = (startHour - 8) * 64;
                    const height = (b.durationMinutes / 60) * 64;

                    return (
                      <div
                        key={b.id}
                        style={{ top: Math.max(0, top), height: Math.max(height, 24), backgroundColor: b.color + "20", borderLeftColor: b.color }}
                        className="absolute inset-x-1 overflow-hidden rounded-r-lg border-l-2 px-1.5 py-1"
                      >
                        <p className="truncate text-[10px] font-bold" style={{ color: b.color }}>{b.service}</p>
                        <p className="truncate text-[10px] text-gray-500">{b.clientName}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
