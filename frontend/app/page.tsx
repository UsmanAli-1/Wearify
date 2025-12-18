
// app/page.tsx
import VirtualTryOnSection from "@/components/VirtualTryOnSection"
import HeroSection from "@/components/HeroSection"
import AiPoweredFeatures from "@/components/AiPoweredFeatures"
import HowItWorksSection from "@/components/HowItWorksSection"
import VirtualTryOnGallery from "@/components/VirtualTryOnGallery"
import Footer from "@/components/Footer";
import AboutSection from "@/components/AboutSection"


export default function Home() {
  return (
    <div >
      <section id="home">
        <HeroSection />
      </section>
      <section id="tryon">
        <VirtualTryOnSection />
      </section>
      <section id="about">
        <AboutSection />
      </section>
      <section id="howitwork">
        <HowItWorksSection />
      </section>
      <section id="collection">
        <VirtualTryOnGallery />
      </section>
        <AiPoweredFeatures />

      <Footer />

    </div>
  );
}

