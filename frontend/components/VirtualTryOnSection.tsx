"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Input } from "@/ui/input";

export default function UploadTryOnSection() {
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const file = e.target.files[0];
        const url = URL.createObjectURL(file);
        setUploadedImage(url);
    };

    return (
        <section className="w-full px-6 md:px-20 py-8 flex flex-col gap-5 bg-gradient-to-r from-[#C8B8FF] to-[#E9D2E7]">
            <h1 className=" m-auto md:text-5xl text-3xl font-bold text-[#3A2154]">Virtual Try On</h1>
            <p className=" text-gray-500 text-md md:max-w-2xl md:mx-auto px-3 ">Upload image and select garment and just click Generate button to see the magic. </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* LEFT COLUMN */}
                <div className="flex flex-col gap-6 ">

                    {/* ==== Clothing Carousel ==== */}
                    <Card className="w-full bg-white/40 rounded-2xl p-3 px-0 shadow border border-white/40 max-w-xl">
                        <CardContent className="flex gap-3 overflow-x-scroll no-scrollbar cursor-grab active:cursor-grabbing">
                            {[
                                "/images/img1.png",
                                "/images/img2.png",
                                "/images/img3.png",
                                "/images/img1.png",
                                "/images/img2.png",
                                "/images/img3.png",
                            ].map((src, i) => (
                                <div
                                    key={i}
                                    className="min-w-[95px] h-[110px] rounded-xl bg-white border shadow-sm flex items-center justify-center"
                                >
                                    <Image src={src} alt="" width={80} height={80} className="object-contain" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* ==== Upload Box ==== */}
                    <Card className="relative bg-white rounded-3xl border border-[#CFC6F0] shadow p-6 h-[285px] flex flex-col items-center justify-center text-center max-w-xl">
                        {/* circles */}
                        <div className="absolute top-4 left-4 w-16 h-23 bg-[#F5E2E8] rounded-full opacity-40"></div>
                        <div className="absolute bottom-4 right-4 w-18 h-18 bg-[#E9D8DB] rounded-full opacity-40"></div>

                        {/* Upload icon */}
                        <div className="w-11 h-11 rounded-full bg-white border shadow flex items-center justify-center ">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="22"
                                height="22"
                                fill="none"
                                stroke="#A06CE3"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                            >
                                <path d="M12 3v12m0-12l-6 6m6-6l6 6M4 15h16v6H4z" />
                            </svg>
                        </div>

                        <h3 className="text-base font-semibold ">
                            Upload Your Photo to Start Your Virtual
                        </h3>
                        <p className="text-gray-500 text-xs ">
                            Browser from device PNG, JPG, JPEG up to 10MB
                        </p>

                        <label className="cursor-pointer text-[#A06CE3] font-semibold text-sm ">
                            <Input
                                type="file"
                                className="hidden"
                                onChange={handleUpload}
                            />
                            Select Image
                        </label>
                    </Card>
                </div>

                {/* RIGHT PREVIEW BOX */}
                <Card className="relative bg-white rounded-3xl border border-[#CFC6F0] shadow p-6 h-[446px] flex items-center justify-center">
                    {/* circles */}
                    <div className="absolute top-3 left-3 w-18 h-25 bg-[#F8D9F3] rounded-full opacity-50"></div>
                    <div className="absolute bottom-3 right-3 w-20 h-20 bg-[#F8D9F3] rounded-full opacity-50"></div>

                    <div className="md:w-132 w-70 h-100 border-2 border-dashed border-pink-300 rounded-2xl flex items-center justify-center overflow-hidden">
                        {uploadedImage ? (
                            <Image src={uploadedImage} alt="" width={400} height={400} className="object-contain" />
                        ) : (
                            <div className="text-gray-500 text-center text-sm">
                                <p>All Magic Happens Here</p>
                                <p>Upload photo to see preview</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Generate button */}
            <div className="flex justify-center">
                <Button
                    variant="secondary"
                    className="px-32 py-6 rounded-full bg-gradient-to-r from-[#9734E6] to-[#E8479C] text-white text-lg shadow-md hover:opacity-90 hover:scale-105 duration-300 "
                >
                    Generate
                </Button>
            </div>
        </section>
    );
}
