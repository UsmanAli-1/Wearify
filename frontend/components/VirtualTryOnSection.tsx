"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Input } from "@/ui/input";
import toast from "react-hot-toast";


export default function UploadTryOnSection() {
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Check login ONCE
    useEffect(() => {
        fetch("http://localhost:4000/api/users/me", {
            credentials: "include",
        })
            .then((res) => setIsLoggedIn(res.ok))
            .catch(() => setIsLoggedIn(false));
    }, []);

    // Upload handler
    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;

        const file = e.target.files[0];
        setUploadedImage(URL.createObjectURL(file));
    };

    // check image upload 
    const handleImageCheck = async () => {
        if (!uploadedImage) {
            toast.error("please Upload image first")
            return
        }

        const res = await fetch("http://localhost:4000/api/users/use-points", {
            method: "POST",
            credentials: "include",
        });

        const data = await res.json();

        if (!res.ok) {
            toast.error(data.message);
            return;
        }

        window.dispatchEvent(new Event("auth-changed"));

        toast.success("Points deducted & generation started");
    }

    return (
        <section className="w-full px-6 md:px-20 py-8 flex flex-col gap-5 bg-gradient-to-r  from-[#4F5D3A] to-[#6B7A4C]">
            <h1 className="m-auto md:text-5xl text-3xl font-bold text-[#1C1C1C]">
                Virtual Try On
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* LEFT */}
                <div className="flex flex-col gap-6">
                    <Card className="bg-[#1C1C1C]/50 rounded-2xl p-3 max-w-xl">
                        <CardContent className="flex gap-3 overflow-x-scroll no-scrollbar">
                            {[
                                "/images/img1.png",
                                "/images/img2.png",
                                "/images/img3.png",
                                "/images/img1.png",
                                "/images/img2.png",
                                "/images/img3.png",
                            ].map(
                                (src, i) => (
                                    <div
                                        key={i}
                                        className="min-w-[95px] h-[110px] bg-white border rounded-xl flex items-center justify-center"
                                    >
                                        <Image src={src} alt="" width={80} height={80} />
                                    </div>
                                )
                            )}
                        </CardContent>
                    </Card>

                    {/* Upload */}
                    <Card className="bg-[#F5F5DC] rounded-3xl p-6 h-[285px] flex flex-col items-center justify-center text-center max-w-xl">
                        <h3 className="font-semibold">Upload Your Photo</h3>
                        <p className="text-gray-500 text-xs">
                            PNG, JPG, JPEG up to 10MB
                        </p>

                        <label
                            className={`mt-3 font-semibold text-sm ${isLoggedIn
                                ? "text-[#A06CE3] cursor-pointer"
                                : "text-gray-400 cursor-not-allowed"
                                }`}
                        >
                            <Input
                                type="file"
                                className="hidden"
                                disabled={!isLoggedIn}
                                onChange={handleUpload}
                            />
                            Select Image
                        </label>

                        {!isLoggedIn && (
                            <p className="text-xs text-red-500 mt-2">
                                Login required to upload image
                            </p>
                        )}
                    </Card>
                </div>

                {/* RIGHT */}
                <Card className="bg-[#F5F5DC] rounded-3xl p-6 h-[446px] flex items-center justify-center">
                    <div className="w-full h-full border-2 border-dashed rounded-2xl flex items-center justify-center">
                        {uploadedImage ? (
                            <Image
                                src={uploadedImage}
                                alt=""
                                width={400}
                                height={400}
                                className="object-contain"
                            />
                        ) : (
                            <p className="text-gray-500 text-sm text-center">
                                Upload image to preview
                            </p>
                        )}
                    </div>
                </Card>
            </div>

            {/* Generate */}
            <div className="flex justify-center">
                <Button
                    disabled={!isLoggedIn}
                    className={`px-32 py-6 rounded-full text-[#F5F5DC] shadow-2xl ${isLoggedIn
                        ? "bg-[#1C1C1C] cursor-pointer"
                        : "bg-[#1C1C1C] cursor-not-allowed"
                        }`}
                    onClick={handleImageCheck}
                >
                    Generate
                </Button>
            </div>
        </section>
    );
}
