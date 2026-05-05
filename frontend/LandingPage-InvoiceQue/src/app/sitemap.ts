import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://invoicequ.my.id";
  const now = new Date();

  const staticPages = [
    { url: baseUrl, priority: 1, changeFrequency: "weekly" as const },
    { url: `${baseUrl}/tentang`, priority: 0.7, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/blog`, priority: 0.8, changeFrequency: "weekly" as const },
    { url: `${baseUrl}/partner`, priority: 0.6, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/api-docs`, priority: 0.7, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/integrasi`, priority: 0.7, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/changelog`, priority: 0.6, changeFrequency: "weekly" as const },
    { url: `${baseUrl}/bantuan`, priority: 0.7, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/dokumentasi`, priority: 0.7, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/status`, priority: 0.5, changeFrequency: "daily" as const },
    { url: `${baseUrl}/komunitas`, priority: 0.5, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/privasi`, priority: 0.3, changeFrequency: "yearly" as const },
    { url: `${baseUrl}/syarat-ketentuan`, priority: 0.3, changeFrequency: "yearly" as const },
    { url: `${baseUrl}/keamanan`, priority: 0.4, changeFrequency: "monthly" as const },
  ];

  return staticPages.map((page) => ({
    url: page.url,
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
