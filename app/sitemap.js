import { resolveAppUrl } from "@/lib/ical";

export default function sitemap() {
  const appUrl = resolveAppUrl();
  if (!appUrl) return [];

  return ["", "/terminos", "/privacidad", "/arrepentimiento"].map((path) => ({
    url: `${appUrl}${path}`,
    changeFrequency: path ? "yearly" : "monthly",
    priority: path ? 0.3 : 1,
  }));
}
