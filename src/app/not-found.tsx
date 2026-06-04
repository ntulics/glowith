"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  { title: "This look doesn't exist", body: "We searched high and low but couldn't find this page. Maybe it booked out." },
  { title: "Page out for a touch-up", body: "The page you're after isn't here right now. Let's get you back to the glow." },
  { title: "Oops — split ends ahead", body: "This link frayed somewhere along the way. Nothing to see at this address." },
  { title: "We lost the thread", body: "That page must've slipped off the styling chair. It's not here anymore." },
  { title: "404 — fully booked", body: "This page is unavailable. Try heading back to discover salons near you." },
  { title: "Nothing glowing here", body: "The page you wanted has gone off-grid. Let's find you something better." },
  { title: "This page took a day off", body: "We can't find what you're looking for. It might have moved or never existed." },
  { title: "Mirror, mirror… nothing there", body: "No page reflects back at this URL. Let's redirect your glow." },
  { title: "Smudged that one", body: "This link didn't set properly. The page you wanted can't be found." },
  { title: "That appointment's gone", body: "The page you're looking for has left the building. Back to Glowith?" }
];

export default function NotFound() {
  const [i, setI] = useState(0);
  useEffect(() => { setI(Math.floor(Math.random() * MESSAGES.length)); }, []);
  const msg = MESSAGES[i];

  function backToGlowith() {
    const host = window.location.host;
    window.location.href = host.endsWith(".glowith.co.za") ? "https://glowith.co.za/" : "/";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md text-center">
        <span role="img" aria-label="Glowith" className="logo-adaptive mx-auto mb-8 h-8" />
        <p className="text-6xl font-black tracking-tight text-[var(--brand)]">404</p>
        <h1 className="mt-4 text-2xl font-black text-[var(--ink)]">{msg.title}</h1>
        <p className="mt-3 text-[var(--muted)]">{msg.body}</p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <button onClick={backToGlowith}
            className="rounded-xl bg-[var(--ink)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--ink)]/90">
            Back to Glowith
          </button>
          <button onClick={() => location.reload()}
            className="rounded-xl border border-[var(--line)] bg-white px-6 py-3 text-sm font-bold text-[var(--ink)] transition hover:border-[var(--brand)]">
            Try again
          </button>
        </div>
      </div>
    </main>
  );
}
