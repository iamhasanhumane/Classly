"use client";

import dynamic from "next/dynamic";

// Disable SSR for the entire course admin page.
// This page is 100% client-side (Convex real-time queries) so there is
// no meaningful HTML to produce on the server.  Rendering on the server
// always produces the loading skeleton, while the Convex client-side
// cache can already have the data ready – causing a guaranteed hydration
// mismatch on every hard-reload.  Opting out of SSR eliminates the
// mismatch entirely.
const AdminCoursePageClient = dynamic(
  () => import("./_client"),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-8">
        <p className="text-muted-foreground">Loading course…</p>
      </div>
    ),
  },
);

export default function AdminCoursePage() {
  return <AdminCoursePageClient />;
}
