import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import { LocaleProvider } from "@/components/ui/LanguageSwitcher";
import { ThemeProvider } from "@/components/ui/ThemeToggle";
import {
  resolveTheme,
  THEME_BOOTSTRAP_SCRIPT,
  THEME_COOKIE,
  type Theme,
} from "@/lib/theme";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  translate,
  type Locale,
  type TranslationKey,
} from "@/lib/i18n";
import { intlLocale } from "@/lib/i18n/format";
import "./globals.css";

const metadataBase = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://trinaxbank.com",
);

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

/** The locale chosen in the switcher, read from the cookie on every request. */
async function requestLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** The theme chosen in the switcher, read from the cookie on every request. */
async function requestTheme(): Promise<Theme> {
  const store = await cookies();
  return resolveTheme(store.get(THEME_COOKIE)?.value);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await requestLocale();
  const t = (key: TranslationKey) => translate(locale, key);

  return {
    metadataBase,
    title: {
      default: t("meta.title"),
      template: `%s | ${t("meta.title")}`,
    },
    description: t("meta.description"),
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png" }],
    },
    manifest: "/site.webmanifest",
    openGraph: {
      title: t("meta.title"),
      description: t("meta.description"),
      url: "/",
      siteName: t("meta.title"),
      images: [{ url: "/og-image.webp", width: 1200, height: 630 }],
      locale: locale === "es" ? "es_ES" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("meta.title"),
      description: t("meta.description"),
      images: ["/og-image.webp"],
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await requestLocale();
  const theme = await requestTheme();

  return (
    <html lang={intlLocale(locale)} className={theme} style={{ colorScheme: theme }}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="dark light" />
        <link rel="icon" type="image/svg+xml" href="/favicon.ico" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body
        className={`${inter.variable} font-sans bg-slate-50 text-zinc-900 dark:bg-[#0a0a0a] dark:text-white`}
      >
        <ThemeProvider initialTheme={theme}>
          <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
