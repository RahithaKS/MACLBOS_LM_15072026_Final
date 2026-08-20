import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import ScheduleRunner from "@/components/ScheduleRunner";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LedgerLM — Boards",
  description:
    "Group analyses, documents, and insights into one centralized financial workspace.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const requestHeaders = await headers();
  const isEmbedded = requestHeaders.get("x-standalone-embedded") === "true";

  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-screen" data-embedded={isEmbedded ? "true" : undefined}>
        <ScheduleRunner />
        <div className="flex min-h-screen">
          {!isEmbedded && <Sidebar />}
          <main className="standalone-page-area flex-1 min-w-0 p-4 lg:p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
