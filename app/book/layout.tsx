import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a Mentorship Session | CAPHA",
  description:
    "Schedule a one-on-one mentorship session with a CAPHA advisor who specializes in your healthcare track.",
};

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
