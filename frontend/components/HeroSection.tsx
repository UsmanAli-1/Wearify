"use client"

import Image from "next/image"
import { Button } from "@/ui/button"
import { Card, CardContent } from "@/ui/card"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCamera, faPlay } from "@fortawesome/free-solid-svg-icons"
import { useState } from "react"
import Motion from "@/components/Motion";
import { fadeUp } from "@/lib/motion";
import { fadeIn } from "@/lib/motion";
import { popUp } from "@/lib/motion";
import { popUpslow } from "@/lib/motion";


export default function HeroSection() {
    const [showVideo, setShowVideo] = useState(false);
    return (
        <>
            <section className="w-full pt-30 flex flex-col md:flex-row items-center justify-evenly px-4 md:px-12 py-14 bg-#E6D5B8 bg-gradient-to-r 
            bg-gradient-to-r from-[#5F6F3E]/80 to-[#9EAB7A]/50 ">

                {/* Left */}
                <Motion variant={fadeUp}>
                    <div className="flex flex-col max-w-xl gap-4">

                        {/* Badge */}
                        <Motion variant={popUp}>
                            <div className="relative md:pl-0 pl-2 w-fit ">
                                <div className="absolute md:-left-10 md:-top-12 -left-2 -top-12 w-28 h-28 bg-gradient-to-r from-[#6B7A4C] to-[#D9C6A3]/70 rounded-full shadow-md hover:scale-105 duration-300 transition" />
                                <CardContent className=" px-6 py-2 text-sm font-semibold text-[#515F3B] relative z-10 bg-[#E6D5B8] backdrop-blur-md shadow-sm rounded-full hover:scale-105 duration-300 transition">
                                    AI-Powered Fashion
                                </CardContent>
                            </div>
                        </Motion>
                        <Motion variant={popUpslow}>
                            <h1 className="text-4xl md:px-0 md:text-5xl font-bold leading-tight text-[#1C1C1C]/90">
                                Transform Your Shopping Experience{" "}
                                <span className="bg-gradient-to-r  from-[#4F5D3A] to-[#6B7A4C] text-transparent bg-clip-text">
                                    Virtually
                                </span>{" "}
                                with AI
                            </h1>
                        </Motion>
                        <Motion variant={fadeIn}>
                            <p className="text-[#1C1C1C]/70 text-lg">
                                Experience the future of fashion with our extraordinary AI technology. Try on thousands of outfits instantly, find your perfect fit, and shop with confidence from the confort of your home .
                            </p>
                        </Motion>

                        <div className="md:flex m-auto md:m-0 gap-4 mt-4 ">
                            <Motion variant={popUp}>
                                <Button
                                    className="rounded-full text-[#E6D5B8] md:w-47 w-70 py-6 text-sm flex items-center gap-2
                                    bg-gradient-to-r from-[#4F5D3A] to-[#6B7A4C]/30 shadow-xl hover:scale-105  duration-300"
                                >
                                    <FontAwesomeIcon icon={faCamera} className="w-3 h-3" />
                                    <a href="#tryon">
                                        Start Virtual Try-On
                                    </a>
                                </Button>
                            </Motion>
                            <Motion variant={popUp}>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowVideo(true)}
                                    className="rounded-full bg-[#1C1C1C] text-[#E6D5B8] hover:text-[#1C1C1C] hover:bg-[#E6D5B8] md:w-35 w-70 py-6 md:mt-0 mt-2  text-sm flex items-center gap-2 shadow-2xl border-none hover:scale-105  duration-300"
                                >
                                    <FontAwesomeIcon icon={faPlay} className="w-3 h-3" />
                                    Watch Demo
                                </Button>
                            </Motion>
                        </div>

                        {/* Stats */}
                        <div className="flex md:gap-10 gap-5 text-[#1C1C1C] mt-2 md:my-0 my-6 font-semibold md:m-0 m-auto ">
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
                </Motion>

                {/* Right */}
                <Motion variant={popUpslow}>
                    <Card className="relative w-full max-w-md m-auto bg-[] p-4 rounded-3xl shadow-xl hover:scale-105 duration-300 transition">
                        <CardContent className="rounded-2xl overflow-hidden p-0">
                            <Image
                                src="/images/hero8.jpeg"
                                alt="Model"
                                width={700}
                                height={700}
                                className="rounded-2xl object-cover "
                            />
                        </CardContent>
                    </Card>
                </Motion>
            </section>

            {/* Sub Section */}
            <section className="w-full text-center py-10 md:px-6 px-4 bg-[#F5F5DC]/90 ">
                <Motion variant={fadeIn}>
                    <h2 className="md:text-5xl text-4xl font-bold text-[#1C1C1C]">Experience Virtual Try-On AI —</h2>
                </Motion>
                <Motion variant={popUp}>
                    <p className="text-[#515F3B] md:text-4xl text-3xl font-bold mt-5">Powered by Wearify AI</p>
                </Motion>
                <Motion variant={fadeUp}>
                    <p className="max-w-4xl mx-auto text-gray-600 mt-4">
                        Upload your photo and instantly try on stylish  outfits with our advanced virtual fitting room.
                        Enjoy a seamless, ultra-realistic try-on experience designed to help you discover your perfect look.
                    </p>
                </Motion>
            </section>

            {showVideo && (
                <div className="m-auto flex justify-center items-center ">
                    <div className=" fixed absolute top-0 w-[100%] h-[100%] z-[9999] bg-black/60 backdrop-blur-sm 
                    flex flex-col items-center justify-center  " >
                        <Button variant="outline" onClick={() => setShowVideo(false)} className="text-white bg-black/60 rounded-4xl absolute md:top-15 md:right-37 top-0 right-0 border-none">X</Button>
                        <video autoPlay controls src="/videos/demo.mp4" className="w-250" />
                    </div>
                </div>
            )}
        </>
    )
}
