"use client";

import Image from "next/image";
import { Button } from "@/ui/button";
import Motion from "@/components/Motion";
import { fadeUp } from "@/lib/motion";
import { fadeIn } from "@/lib/motion";
import { popUp } from "@/lib/motion";
import { popUpslow } from "@/lib/motion";

export default function VirtualTryOnGallery() {
  return (
    <section className="w-full flex flex-col items-center bg-[#F5F5DC]">

      {/* ---------- GALLERY SECTION ---------- */}
      <div className="w-full max-w-5xl mx-auto text-center py-14 px-6 ">
        <Motion variant={fadeUp}>
          <h2 className="text-3xl font-bold mb-3 text-[#1C1C1C]/90">Virtual Try-On Gallery</h2>
        </Motion>
        <Motion variant={fadeIn}>
          <p className="text-gray-500 text-sm mb-10">
            See real examples of our AI-powered virtual try-on technology in action
          </p>
        </Motion>

        {/* Images */}
        <div className="grid grid-cols-2  md:grid-cols-4 gap-5 ">
          {["gg1.jpg", "gg2.jpg", "gg3.jpg", "gg4.jpg"].map((src, i) => (
            <Motion variant={popUpslow}>
              <div key={i} className="w-full rounded-xl overflow-hidden shadow-2xl hover:scale-110 duration-300 trasition">
                <Image
                  src={`/images/${src}`}
                  alt={`Gallery Image ${i + 1}`}
                  width={300}
                  height={350}
                  className="object-cover w-full h-80"
                />
              </div>
            </Motion>
          ))}
        </div>
      </div>

      {/* ---------- CTA SECTION (Gradient) ---------- */}
      <section className="w-full">
        <Motion variant={popUp}>
          <div className="mx-auto w-[95%] bg-[#1C1C1C]/90 md:py-15 py-8 text-center px-6 shadow-xl rounded-2xl md:rounded-full hover:scale-105 duration-300 transition">
            <Motion variant={fadeIn}>
              <h2 className="md:text-5xl text-3xl font-bold md:mb-5 text-[#E6D5B8] ">Ready to Transform Your Shopping?</h2>
              <p className="text-[#F5F5DC]/70 md:text-sm text-xs  mb-8 md:mt-0 mt-5 max-w-lg  mx-auto">
                Join over 500,000 people who shop smarter with AI-powered virtual try-ons
              </p>
            </Motion>

            {/* Button */}
            <Motion variant={popUpslow}>
              <Button
                className="shadow-xl rounded-full px-6 py-5 text-sm font-medium hover:bg-[#1C1C1C] hover:text-[#E6D5B8] bg-[#E6D5B8] text-[#1C1C1C] hover:scale-110 duration-300"
              >
                <a href="#tryon">
                  Try Now →
                </a>
              </Button>
            </Motion>
            {/* Footnote */}
            <p className="text-xs text-[#F5F5DC]/70 mt-5">
              No credit card required • 3 free generations • Cancel anytime
            </p>
          </div>
        </Motion>
      </section>
    </section>
  );
}
