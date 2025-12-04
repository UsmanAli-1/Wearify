"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Users, Sparkles, GraduationCap, UserCheck } from "lucide-react";

export default function AboutSection() {
    return (
        <section
            id="about"
            className="w-full py-12 px-6 md:px-20 "
        >
            <div className="max-w-5xl mx-auto text-center mb-12">
                <h2 className="text-3xl md:text-5xl font-bold text-gray-800">
                    About Us
                </h2>
                <p className="text-gray-600 mt-3 max-w-3xl mx-auto leading-relaxed">
                    We’re building an AI-powered fashion assistant that helps you discover
                    what truly suits you. Upload your picture, and our system analyzes your
                    body type and skin tone to recommend perfect outfits.
                    <br /><br />
                    You can also try on any garment you like — our Virtual Try-On technology
                    shows a realistic preview of how it will look on you.
                    <br /><br />
                    <span className="font-bold text-gray-700">Our goal is simple:</span><br />
                    <span className="font-semibold text-gray-700">
                        <i>"Make online shopping personal, smart, and confidence-boosting."</i>
                    </span>
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 ">

                {/* Project Title Card */}
                <Card className="shadow-md border-pink-200/60 bg-white hover:scale-105 duration-300"
                    style={{
                        background: "linear-gradient(135deg, #FDF3F8 0%, #FFFFFF 100%)",
                    }}
                >
                    <CardHeader>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r from-[#A86CE3] to-[#EF5BA1] text-white shadow-md">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <CardTitle className="mt-4 text-xl font-bold text-gray-800">
                            Project Title
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-gray-600 text-sm">
                        Wearify - AI-Powered Virtual Try-On System 
                    </CardContent>
                </Card>

                {/* Group Members Card */}
                <Card className="shadow-md border-pink-200/60 bg-white hover:scale-105 duration-300"
                    style={{
                        background: "linear-gradient(135deg, #FDF3F8 0%, #FFFFFF 100%)",
                    }}
                >
                    <CardHeader>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r from-[#A86CE3] to-[#EF5BA1] text-white shadow-md">
                            <Users className="w-6 h-6" />
                        </div>
                        <CardTitle className="mt-4 text-xl font-bold text-gray-800">
                            Our Team
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-gray-600 text-sm space-y-2">
                        <p><span className="font-semibold text-gray-700">Member 1:</span> Usman Ali – [23237]</p>
                        <p><span className="font-semibold text-gray-700">Member 2:</span> Adil Usman – [23151]</p>
                        <p><span className="font-semibold text-gray-700">Member 3:</span> Syed Rohan Shah  – [23166]</p>
                        <p><span className="font-semibold text-gray-700">Member 4:</span> Hadia Rafiq– [25195]</p>
                        <p className="pt-1 text-gray-500 text-xs">(B.S. Computer Science — Iqra University)</p>
                    </CardContent>
                </Card>

                {/* Supervisor Card */}
                <Card className="shadow-md border-pink-200/60 bg-white hover:scale-105 duration-300"
                    style={{
                        background: "linear-gradient(135deg, #FDF3F8 0%, #FFFFFF 100%)",
                    }}
                >
                    <CardHeader>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r from-[#A86CE3] to-[#EF5BA1] text-white shadow-md">
                            <UserCheck className="w-6 h-6" />
                        </div>
                        <CardTitle className="mt-4 text-xl font-bold text-gray-800">
                            Supervisor
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-gray-600 text-sm">
                        <p className="font-semibold text-gray-800">Dr. Saad Ahmed</p>
                        <p>Head of Department – Computer Science</p>
                        <p>Iqra University</p>
                    </CardContent>
                </Card>

            </div>

            {/* Bottom University Badge */}
            <div className="text-center mt-12 hover:scale-105 duration-300">
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white shadow border border-pink-200/50">
                    <GraduationCap className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-gray-700">
                        Final Year Project — B.S. Computer Science, Iqra University
                    </span>
                </div>
            </div>
        </section>
    );
}
