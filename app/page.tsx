
// app/page.tsx
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera, faPlay } from "@fortawesome/free-solid-svg-icons";
import VirtualTryOnSection from "@/components/VirtualTryOnSection"

export default function Home() {
  return (
    <div className="flex flex-col w-full min-h-screen bg-white text-gray-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full flex items-center justify-between px-8  shadow-sm bg-white">
        <div>
          <Image src="/images/logo1.png" alt="Model" width={120} height={0} className="object-cover" />
        </div>

        <div className="hidden md:flex gap-6 font-medium">
          <a href="#">Home</a>
          <a href="#">Collection</a>
          <a href="#">How it Works</a>
          <a href="#">About</a>
        </div>

        <Button className="rounded-full bg-[#F7DDE2] hover:bg-[#B1AAAA] text-black">
          Sign In/Sign Up
        </Button>
      </nav>


      {/* Hero Section */}
      <section className="w-full flex flex-col md:flex-row items-center justify-between px-8 md:px-12 py-14  bg-gradient-to-r from-[#C8B8FF]/100 to-[#E9D2E7]/20">

        {/* Left Content */}
        <div className="flex flex-col max-w-xl gap-4">

          {/* Badge + Circle */}
          <div className="relative w-fit">
            <div className="absolute -left-10 -top-12 w-28 h-28 bg-[#DBD0F6] rounded-full opacity-80" />
            <div className="relative z-10 bg-white/80 backdrop-blur-md px-6 py-2 rounded-full text-sm font-semibold text-[#9B54DA] shadow-md">
              AI-Powered Fashion
            </div>
          </div>


          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Transform Your Shopping Experience{" "}
            <span className="bg-gradient-to-b from-[#CC40B6] to-[#E64EA4] text-transparent bg-clip-text">
              Virtually
            </span>{" "}
            with AI
          </h1>


          <p className="text-gray-600 text-lg">
            Experience the future of fashion with our extraordinary AI technology. Try on thousands of outfits instantly, find your perfect fit, and shop with confidence from the confort of your home .
          </p>


          <div className="flex gap-4 mt-4">

            {/* Start Virtual Try-On Button */}
            <Button
              className="rounded-full text-white w-50 py-6 text-sm flex items-center gap-2 
               bg-gradient-to-r from-[#9734E6] to-[#E8479C] hover:opacity-90"
            >
              <FontAwesomeIcon icon={faCamera} className="w-3 h-3" />
              Start Virtual Try-On
            </Button>

            {/* Watch Demo Button */}
            <Button
              className="rounded-full w-37 bg-white text-black/70 py-6 text-sm flex items-center gap-2 shadow-sm"
            >
              <FontAwesomeIcon icon={faPlay} className="w-3 h-3" />
              Watch Demo
            </Button>

          </div>


          <div className="flex gap-10 text-gray-700 mt-2 font-semibold">
            <div>
              <span className="text-2xl font-bold">500k+</span><br />Happy Users
            </div>
            <div>
              <span className="text-2xl font-bold">1M+</span><br />Try-Ons Daily
            </div>
            <div>
              <span className="text-2xl font-bold">98%</span><br />Accuracy
            </div>
          </div>
        </div>

        {/* Right — Model Image */}
        <div className="relative w-full max-w-xl m-auto ">
          {/* Outer soft purple card */}
          <div className="bg-[#F4E8FE] p-4 rounded-3xl shadow-xl">
            {/* Inner card with clean white background */}
            <div className="rounded-3xl bg-white overflow-hidden ">
              <Image
                src="/images/c1.png"
                alt="Model"
                width={700}
                height={700}
                className="object-cover rounded-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 */}
      <section className="w-full text-center py-10 px-6">
        <h2 className="text-5xl font-bold text-[#3A2154] ">Experience Virtual Try-On AI —</h2>
        <p className="text-[#EC4899] text-4xl font-bold mt-5">Powered by Wearify AI</p>
        <p className="max-w-4xl mx-auto text-gray-600 mt-4">
          Upload your photo and instantly try on stylish women's outfits with our advanced virtual fitting room.
          Enjoy a seamless, ultra-realistic try-on experience designed to help you discover your perfect look.
        </p>
      </section>

      {/* Try-On Section */}
      <VirtualTryOnSection />
    </div>
  );
}

