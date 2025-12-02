import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { TopNav } from "@/components/TopNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "x402 Gateway",
  description: "AI Payment Gateway for Agent Commerce",
  icons: {
    icon: "/convex.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorBackground: "#0a0a0a",
          colorInputBackground: "#1a1a1a",
          colorPrimary: "#fff",
          colorText: "#fff",
          colorTextSecondary: "#888",
          colorInputText: "#fff",
        },
        elements: {
          formButtonPrimary: "bg-white text-black hover:bg-gray-200",
          card: "bg-[#111] border border-[#333]",
          headerTitle: "text-white",
          headerSubtitle: "text-[#888]",
          socialButtonsBlockButton: "bg-[#1a1a1a] border-[#333] text-white hover:bg-[#222]",
          formFieldInput: "bg-[#0a0a0a] border-[#333] text-white",
          footerActionLink: "text-white hover:text-gray-300",
          identityPreviewEditButton: "text-white",
          userButtonPopoverCard: "bg-[#111] border border-[#333]",
          userButtonPopoverActionButton: "text-[#888] hover:text-white hover:bg-[#1a1a1a]",
          userButtonPopoverActionButtonText: "text-[#888]",
          userButtonPopoverFooter: "hidden",
        },
      }}
    >
      <html lang="en" className="dark">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0a]`}
        >
          <ConvexClientProvider>
            <TopNav />
            {children}
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
