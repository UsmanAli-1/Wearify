"use client"

import Image from "next/image"
import { Button } from "@/ui/button"
import { Card, CardContent } from "@/ui/card"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCamera, faPlay } from "@fortawesome/free-solid-svg-icons"
import { useState } from "react"

export default function HeroSection() {
    const [showVideo, setShowVideo] = useState(false);
    return (
        <>  
            <section className="w-full flex flex-col md:flex-row items-center justify-between px-4 md:px-12 py-14 bg-gradient-to-r from-[#C8B8FF] to-[#E9D2E7]/20">

                {/* Left */}
                <div className="flex flex-col max-w-xl gap-4">

                    {/* Badge */}
                    <div className="relative md:pl-0 pl-2 w-fit">
                        <div className="absolute md:-left-10 md:-top-12 -left-2 -top-12 w-28 h-28 bg-[#DDD1F5] rounded-full " />
                        <CardContent className=" px-6 py-2 text-sm font-semibold text-[#9B54DA] relative z-10 bg-white/80 backdrop-blur-md shadow-sm rounded-full">
                            AI-Powered Fashion
                        </CardContent>
                    </div>

                    <h1 className="text-4xl md:px-0 md:text-5xl font-bold leading-tight">
                        Transform Your Shopping Experience{" "}
                        <span className="bg-gradient-to-b from-[#CC40B6] to-[#E64EA4] text-transparent bg-clip-text">
                            Virtually
                        </span>{" "}
                        with AI
                    </h1>

                    <p className="text-gray-600  text-lg">
                        Experience the future of fashion with our extraordinary AI technology. Try on thousands of outfits instantly, find your perfect fit, and shop with confidence from the confort of your home .
                    </p>

                    <div className="md:flex m-auto md:m-0 gap-4 mt-4 ">
                        <Button
                            className="rounded-full text-white md:w-47 w-70 py-6 text-sm flex items-center gap-2
                            bg-gradient-to-r from-[#9734E6] to-[#E8479C] shadow-md hover:scale-105  duration-300"
                        >
                            <FontAwesomeIcon icon={faCamera} className="w-3 h-3" />
                            <a href="#tryon">
                                Start Virtual Try-On
                            </a>
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => setShowVideo(true)}
                            className="rounded-full bg-white text-black/70 md:w-35 w-70 py-6 md:mt-0 mt-2  text-sm flex items-center gap-2 shadow-sm border-none hover:scale-105  duration-300"
                        >
                            <FontAwesomeIcon icon={faPlay} className="w-3 h-3" />
                            Watch Demo
                        </Button>
                    </div>

                    {/* Stats */}
                    <div className="flex md:gap-10 gap-5 text-gray-700 mt-2 md:my-0 my-6 font-semibold md:m-0 m-auto ">
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

                {/* Right */}
                <Card className="relative w-full max-w-xl m-auto bg-[#F4E8FE] p-4 rounded-3xl shadow-xl">
                    <CardContent className="rounded-3xl bg-white overflow-hidden p-0">
                        <Image
                            src="/images/c1.png"
                            alt="Model"
                            width={700}
                            height={700}
                            className="rounded-2xl object-cover"
                        />  
                    </CardContent>
                </Card>
            </section>

            {/* Sub Section */}
            <section className="w-full text-center py-10 md:px-6 px-4 ">
                <h2 className="md:text-5xl text-4xl font-bold text-[#3A2154]">Experience Virtual Try-On AI —</h2>
                <p className="text-[#EC4899] md:text-4xl text-3xl font-bold mt-5">Powered by Wearify AI</p>
                <p className="max-w-4xl mx-auto text-gray-600 mt-4">
                    Upload your photo and instantly try on stylish  outfits with our advanced virtual fitting room.
                    Enjoy a seamless, ultra-realistic try-on experience designed to help you discover your perfect look.
                </p>
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
