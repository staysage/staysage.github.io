import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const metadataByLanguage: Record<
  string,
  { title: string; description: string; lang: string }
> = {
  zh: {
    title: "旅宿优选 Staysage - 对比酒店价值、积分与净成本",
    description:
      "一眼对比万豪、希尔顿、凯悦、洲际、雅高、温德姆、亚朵、华住会等主流品牌的价值、积分与净成本。",
    lang: "zh-CN",
  },
  "zh-TW": {
    title: "StaySage 住賞 - 睇清酒店價值、積分同淨成本",
    description:
      "一眼睇清萬豪、希爾頓、凱悅、洲際、雅高、溫德姆、亞朵、華住會等品牌嘅價值、積分同淨成本。",
    lang: "zh-HK",
  },
  en: {
    title: "Staysage - Compare hotel value, points, and net cost",
    description:
      "Compare hotel value, points, and net cost across top brands like Marriott, Hilton, Hyatt, IHG, Accor, Wyndham, Atour, and H World.",
    lang: "en",
  },
  es: {
    title: "Staysage - Compara valor, puntos y costo neto",
    description:
      "Compara valor, puntos y costo neto de marcas como Marriott, Hilton, Hyatt, IHG, Accor, Wyndham, Atour y H World.",
    lang: "es",
  },
  ko: {
    title: "Staysage - 호텔 가치·포인트·실질 비용 비교",
    description:
      "Marriott, Hilton, Hyatt, IHG, Accor, Wyndham, Atour, H World 등 주요 브랜드의 가치, 포인트, 실질 비용을 한눈에 비교합니다.",
    lang: "ko",
  },
  ja: {
    title: "Staysage - ホテル価値・ポイント・実質コスト比較",
    description:
      "Marriott、Hilton、Hyatt、IHG、Accor、Wyndham、Atour、H World など主要ブランドの価値・ポイント・実質コストを比較。",
    lang: "ja",
  },
};

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const language = metadataByLanguage[cookieStore.get("language")?.value ?? ""]
    ? cookieStore.get("language")?.value ?? "zh"
    : "zh";
  const data = metadataByLanguage[language] ?? metadataByLanguage.zh;
  return {
    title: data.title,
    description: data.description,
    icons: {
      icon: "/favicon.svg",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const language = metadataByLanguage[cookieStore.get("language")?.value ?? ""]
    ? cookieStore.get("language")?.value ?? "zh"
    : "zh";
  const htmlLang = metadataByLanguage[language]?.lang ?? "zh-CN";
  return (
    <html lang={htmlLang}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
