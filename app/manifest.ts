import type { MetadataRoute } from "next";

const ICON_VERSION = "2026-09-18-orange";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AlignEDU",
    short_name: "AlignEDU",
    description: "AI-powered lesson analysis for teachers, administrators, and districts.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1220",
    theme_color: "#0f172a",
    categories: ["education", "productivity", "business"],
    icons: [
      {
        src: `/alignedu-icon.svg?v=${ICON_VERSION}`,
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
