import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/privacy", "/sign-in", "/sign-up"],
        disallow: [
          "/api/",
          "/dashboard",
          "/analytics",
          "/profile",
          "/agent",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
