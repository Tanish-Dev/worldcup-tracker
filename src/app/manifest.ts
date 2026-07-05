import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FIFA World Cup 2026 · Intelligent Analytics Dashboard",
    short_name: "WC26 Predictor",
    description:
      "AI-powered real-time insights for the 2026 World Cup — a Poisson goal-scoring model trained on 1930-2022 results, simulated 20,000 times against the live bracket.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
