import type { Metadata } from "next";
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Live Weather Board",
  description: "Realtime weather dashboard powered by Supabase and Open-Meteo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <header className="fixed right-4 top-4 z-50 flex items-center gap-2">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="rounded-full border border-white/20 bg-slate-950/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg backdrop-blur hover:bg-slate-900">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 shadow-lg hover:bg-cyan-300">
                  Sign up
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-9 w-9 ring-2 ring-white/40",
                  },
                }}
              />
            </Show>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
