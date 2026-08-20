import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import ScheduleRunner from "@/components/ScheduleRunner";
import EmbeddedMode from "@/components/EmbeddedMode";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LedgerLM — Boards",
  description:
    "Group analyses, documents, and insights into one centralized financial workspace.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-screen">
        <ScheduleRunner />
        <EmbeddedMode />
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="standalone-page-area flex-1 min-w-0 p-4">{children}</main>
        </div>
      </body>
    </html>
  );
}
