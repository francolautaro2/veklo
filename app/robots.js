import { resolveAppUrl } from "@/lib/ical";

export default function robots() {
  const appUrl = resolveAppUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/precheckin/", "/auth/"],
    },
    ...(appUrl ? { sitemap: `${appUrl}/sitemap.xml` } : {}),
  };
}
