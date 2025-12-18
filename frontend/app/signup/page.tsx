"use client";

import Image from "next/image";
import { Card, CardContent } from "@/ui/card";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";

export default function SignUp() {
    return (
        <div className="h-140 w-full flex items-center justify-center ">
            <div className="max-w-5xl w-full flex flex-col md:flex-row items-center justify-between px-6 md:px-12 md:gap-45">

                {/* LEFT SIDE */}
                <div className="flex flex-col items-center justify-center text-center w-full md:w-1/2">

                    {/* Gradient Brand Name */}
                    <h1 className="hidden md:block text-5xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent pb-4">
                        Wearify
                    </h1>

                    {/* Logo */}
                    <Image
                        src="/images/sidelogo.png"
                        alt="Side Logo"
                        width={240}
                        height={240}
                        className="w-10 sm:w-40 md:w-64 lg:w-60 object-contain md:mb-4 mx-auto"
                    />

                    {/* Login Link */}
                    <p className="md:block hidden text-sm text-gray-600">
                        Already have an account?
                        <a href="/signin" className="text-blue-600 ml-1 font-medium hover:underline">
                            Sign In
                        </a>
                    </p>
                </div>

                {/* RIGHT SIDE - SIGNUP CARD */}
                <Card
                    className="w-full md:w-1/2 md:rounded-xl md:shadow-xl md:bg-gradient-to-r from-[#C3A5FF] to-[#F9D9C7] md:py-6  py-0
                    border-none shadow-none "
                >
                    <CardContent>

                        {/* Title */}
                        <h2 className="md:text-4xl text-3xl font-bold text-center bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent pb-6 ">
                            Sign Up
                        </h2>

                        {/* Full Name */}
                        <label className="text-sm font-medium text-gray-700">Full Name</label>
                        <Input
                            placeholder="Enter your name"
                            className="mb-4 bg-white"
                        />

                        {/* Email  */}
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <Input
                            placeholder="Email"
                            className="mb-4 bg-white"
                        />

                        {/* Phone */}
                        <label className="text-sm font-medium text-gray-700">Phone Number</label>
                        <Input
                            type="tel"
                            placeholder="Phone Number"
                            className="mb-4 bg-white"
                        />

                        {/* Password */}
                        <label className="text-sm font-medium text-gray-700">Password</label>
                        <Input
                            type="password"
                            placeholder="Password"
                            className="mb-8 bg-white"
                        />

                        {/* Create Account Button */}
                        <Button
                            className="w-full py-2 mb-4 rounded-lg text-white font-semibold"
                            style={{
                                background: "linear-gradient(90deg, #5AA5E8, #9B35E4)",
                            }}
                        >
                            Create Account
                        </Button>

                        {/* Login Link */}
                        <p className="text-center text-sm text-black">
                            Already have an account?
                            <a href="/signin" className="font-semibold text-blue-600 ml-1 hover:underline">
                                Sign In
                            </a>
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
