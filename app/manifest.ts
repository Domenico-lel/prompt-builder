import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Prompt Builder",
    short_name: "Prompt Builder",
    description:
      "Trasforma un'idea semplice in un prompt strutturato per qualsiasi AI.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a10",
    theme_color: "#0a0a10",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
