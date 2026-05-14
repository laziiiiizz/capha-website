import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Hero from "@/components/sections/Hero";
import Events from "@/components/sections/Events";
import Resources from "@/components/sections/Resources";
import Leadership from "@/components/sections/Leadership";
import Contact from "@/components/sections/Contact";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Central Asian Pre-Health Association (CAPHA)",
  description:
    "CAPHA supports Central Asian students pursuing healthcare careers in the US through mentorship, monthly workshops, and a tight-knit community of pre-med, pre-dental, PA, nursing, pharmacy, and public health students.",
  openGraph: {
    title: "Central Asian Pre-Health Association (CAPHA)",
    description:
      "Mentorship, workshops, and community for Central Asian students pursuing healthcare careers in the United States.",
    images: [{ url: "/logo.jpeg", width: 400, height: 400, alt: "CAPHA Logo" }],
  },
};

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Events />
        <Resources />
        <Leadership />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
