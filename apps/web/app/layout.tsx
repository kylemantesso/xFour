import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { TopNav } from "@/components/TopNav";
import { ToastProvider } from "@/components/Toast";
import { Web3Provider } from "@/components/Web3Provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "xFour",
  description: "Payment Infrastructure for AI Agents | xfour.xyz",
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
          colorText: "#ffffff",
          colorTextSecondary: "#ffffff",
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
          userButtonPopoverCard: "bg-[#111] border border-[#333] [&_*]:text-white",
          userButtonPopoverMain: "text-white [&_*]:text-white",
          userButtonPopoverIdentity: "text-white [&_*]:text-white",
          userButtonPopoverIdentityText: "text-white [&_*]:text-white",
          userButtonPopoverActions: "text-white [&_*]:text-white",
          userButtonPopoverActionButton: "text-white hover:text-white hover:bg-[#1a1a1a] [&_*]:text-white",
          userButtonPopoverActionButtonText: "!text-white",
          userButtonPopoverActionButtonIcon: "text-white",
          userButtonPopoverFooter: "hidden",
        },
      }}
    >
      <html lang="en" className="dark">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0a]`}
        >
          <ConvexClientProvider>
            <Web3Provider>
              <ToastProvider>
                <TopNav />
                {children}
              </ToastProvider>
            </Web3Provider>
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
