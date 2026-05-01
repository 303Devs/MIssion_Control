import { NextResponse } from "next/server";

const CANVAS_ICAL_URL = process.env.CANVAS_ICAL_URL;

interface CalEvent {
  id: string;
  title: string;
  dueDate: string;
  course: string;
  type: string;
  url: string;
}

function parseIcal(icalText: string): CalEvent[] {
  const events: CalEvent[] = [];
  const lines = icalText.split(/\r?\n/);
  let inEvent = false;
  const rawProps: Record<string, string> = {};

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // Handle line folding
    while (i + 1 < lines.length && (lines[i + 1].startsWith(" ") || lines[i + 1].startsWith("\t"))) {
      i++;
      line += lines[i].slice(1);
    }

    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      Object.keys(rawProps).forEach((k) => delete rawProps[k]);
    } else if (line === "END:VEVENT" && inEvent) {
      inEvent = false;
      const title = rawProps["SUMMARY"] || "Untitled";
      const dtStart = rawProps["DTSTART"] || rawProps["DTSTART;VALUE=DATE"] || "";
      const dtDue = rawProps["DUE"] || rawProps["DUE;VALUE=DATE"] || dtStart;
      const url = rawProps["URL"] || "";
      const uid = rawProps["UID"] || Math.random().toString(36);
      const desc = rawProps["DESCRIPTION"] || "";

      // Parse course name from title (e.g., "Quiz 3 [CSCI 4830]")
      const courseMatch = title.match(/\[([^\]]+)\]/);
      const course = courseMatch ? courseMatch[1] : desc.match(/Course: ([^\n]+)/)?.[1] || "Canvas";
      const cleanTitle = title.replace(/\s*\[[^\]]+\]$/, "").trim();

      // Parse date
      let dueDate = "";
      try {
        if (dtDue) {
          // Handle YYYYMMDDTHHMMSSZ format
          const m = dtDue.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/);
          if (m) {
            const d = new Date(
              parseInt(m[1]),
              parseInt(m[2]) - 1,
              parseInt(m[3]),
              m[4] ? parseInt(m[4]) : 23,
              m[5] ? parseInt(m[5]) : 59
            );
            dueDate = d.toISOString();
          }
        }
      } catch {
        dueDate = "";
      }

      // Only include future events (or recent past)
      const now = new Date();
      const eventDate = dueDate ? new Date(dueDate) : null;
      const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

      if (eventDate && eventDate > cutoff) {
        events.push({
          id: uid,
          title: cleanTitle,
          dueDate,
          course,
          type: title.toLowerCase().includes("quiz")
            ? "quiz"
            : title.toLowerCase().includes("assignment") || title.toLowerCase().includes("hw")
            ? "assignment"
            : title.toLowerCase().includes("exam") || title.toLowerCase().includes("midterm") || title.toLowerCase().includes("final")
            ? "exam"
            : "assignment",
          url,
        });
      }
    } else if (inEvent) {
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).split(";")[0].trim();
        const value = line.slice(colonIdx + 1).trim();
        rawProps[key] = value;
      }
    }
  }

  return events.sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

export async function GET() {
  if (!CANVAS_ICAL_URL) {
    return NextResponse.json({ events: [], count: 0, error: "CANVAS_ICAL_URL is not configured" });
  }

  try {
    const res = await fetch(CANVAS_ICAL_URL, {
      next: { revalidate: 900 }, // cache 15 min
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const events = parseIcal(text);
    return NextResponse.json({ events, count: events.length });
  } catch (err) {
    return NextResponse.json({
      events: [],
      error: err instanceof Error ? err.message : "Failed to fetch Canvas",
    });
  }
}
