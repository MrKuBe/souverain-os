import type { Metadata, Viewport } from "next";

import "@/app/globals.css";
import { AuthDialogProvider } from "@/components/auth/auth-dialog-provider";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { getCurrentUser } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "SouverainOS — Audit de Dépendance Numérique des SIH",
    template: "%s · SouverainOS",
  },
  description:
    "Plateforme open source d'audit et de scoring de la dépendance numérique des Systèmes d'Information Hospitaliers d'un GHT.",
  applicationName: "SouverainOS",
  authors: [{ name: "Bertrand Kuzbinski" }],
  creator: "Bertrand Kuzbinski",
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
  colorScheme: "dark light",
};

const themeScript = `
(function () {
  try {
    var theme = localStorage.getItem("souverainos-theme");
    if (theme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  } catch (error) {
    document.documentElement.classList.add("dark");
  }
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AuthDialogProvider>
          <div className="flex min-h-dvh flex-col">
            <Header user={user} />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </AuthDialogProvider>
      </body>
    </html>
  );
}
