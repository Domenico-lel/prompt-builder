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
    background_color: "#101411",
    theme_color: "#101411",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
