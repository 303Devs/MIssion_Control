import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Toolbar from "@/components/Toolbar";

export const metadata: Metadata = {
  title: "Mission Control",
  description: "AI Agent Workforce Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="bg-gray-950 text-gray-100 flex h-screen overflow-hidden antialiased">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Toolbar />
          <main className="flex-1 overflow-y-auto bg-gray-950">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
