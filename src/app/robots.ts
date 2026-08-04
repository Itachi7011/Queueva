import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep private/transactional areas out of search results.
        disallow: ["/api/", "/admin", "/login", "/signup", "/verify", "/*/dashboard", "/*/account", "/*/pay"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
