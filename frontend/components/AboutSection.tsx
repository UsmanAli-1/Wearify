"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Users, Sparkles, GraduationCap, UserCheck } from "lucide-react";
import Motion from "@/components/Motion";
import { fadeUp } from "@/lib/motion";
import { fadeIn } from "@/lib/motion";
import { popUp } from "@/lib/motion";
import { popUpslow } from "@/lib/motion";
import { motion } from "framer-motion";

export default function AboutSection() {
    return (
        <section
            id="about"
            className="w-full py-12 px-6 md:px-20 bg-[#F5F5DC]"
        >
            <div className="max-w-5xl mx-auto text-center mb-12">
                <h2 className="text-3xl md:text-5xl font-bold text-[#1C1C1C]/90">
                    <Motion variant={fadeUp}>
                        About Us
                    </Motion>
                </h2>
                <Motion variant={fadeIn}>
                    <p className="text-gray-600 mt-3 max-w-3xl mx-auto leading-relaxed">
                        We’re building an AI-powered fashion assistant that helps you discover
                        what truly suits you. Upload your picture, and our system analyzes your
                        body type and skin tone to recommend perfect outfits.
                        <br /><br />
                        You can also try on any garment you like — our Virtual Try-On technology
                        shows a realistic preview of how it will look on you.
                        <br /><br />
                        <motion.span
                            initial={{ scale: 0.5, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="block mt-2"
                        >
                            <span className="font-bold text-gray-700">Our goal is simple:</span><br />
                            <span className="font-semibold text-gray-700">
                                <i>"Make online shopping personal, smart, and confidence-boosting."</i>
                            </span>
                        </motion.span>
                    </p>
                </Motion>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 ">

                {/* Project Title Card */}
                <Motion variant={popUpslow}>
                    <Card className="shadow-lg h-[300] border-none bg-white hover:scale-105 duration-300"
                        style={{
                            background: "linear-gradient(135deg, #6B7A4C 0%, #F5F5DC 100%)",
                        }}
                    >
                        <CardHeader>
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r  from-[#4F5D3A] to-[#6B7A4C] text-white shadow-md">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <CardTitle className="mt-4 text-xl font-bold text-[#1C1C1C]/90">
                                Project Title
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-gray-700 text-sm">
                            Wearify - AI-Powered Virtual Try-On System
                        </CardContent>
                    </Card>
                </Motion>

                {/* Group Members Card */}
                <Motion variant={popUpslow}>
                    <Card className="shadow-lg border-none bg-[#F5F5DC] backdrop-blur-md hover:scale-105 duration-300"
                        style={{
                            background: "linear-gradient(135deg, #6B7A4C 0%, #F5F5DC 100%)",
                        }}

                    >
                        <CardHeader>
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r  from-[#4F5D3A] to-[#6B7A4C] text-white shadow-md">
                                <Users className="w-6 h-6" />
                            </div>
                            <CardTitle className="mt-4 text-xl font-bold text-[#1C1C1C]/90">
                                Our Team
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-gray-700 text-sm space-y-2">
                            <p><span className="font-semibold text-[#1C1C1C]/80">Member 1:</span> Usman Ali – [23237]</p>
                            <p><span className="font-semibold text-[#1C1C1C]/80">Member 2:</span> Adil Usman – [23151]</p>
                            <p><span className="font-semibold text-[#1C1C1C]/80">Member 3:</span> Syed Rohan Shah  – [23166]</p>
                            <p><span className="font-semibold text-[#1C1C1C]/80">Member 4:</span> Hadia Rafiq– [25195]</p>
                            <p className="pt-1 text-[#1C1C1C]/50 text-xs">(B.S. Computer Science — Iqra University)</p>
                        </CardContent>
                    </Card>
                </Motion>

                {/* Supervisor Card */}
                <Motion variant={popUpslow}>
                    <Card className="shadow-lg border-none h-[305] bg-white hover:scale-105 duration-300"
                        style={{
                            background: "linear-gradient(135deg,  #6B7A4C 0%, #F5F5DC 100%)",
                        }}
                    >
                        <CardHeader>
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r  from-[#4F5D3A] to-[#6B7A4C] text-white shadow-md">
                                <UserCheck className="w-6 h-6" />
                            </div>
                            <CardTitle className="mt-4 text-xl font-bold text-[#1C1C1C]/90">
                                Supervisor
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-gray-600 text-sm">
                            <p className="font-semibold text-gray-800">Dr. Saad Ahmed</p>
                            <p>Head of Department – Computer Science</p>
                            <p>Iqra University</p>
                        </CardContent>
                    </Card>
                </Motion>

            </div>

            {/* Bottom University Badge */}
            <div className="text-center mt-12 hover:scale-105 duration-300">
                <Motion variant={popUp}>
                    <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-[#1C1C1C]/80 shadow-lg border border-none">
                        <GraduationCap className="w-5 h-5 text-[#F5F5DC]" />
                        <span className="font-medium text-[#F5F5DC]">
                            Final Year Project — B.S. Computer Science, Iqra University
                        </span>
                    </div>
                </Motion>
            </div>
        </section>
    );
}
