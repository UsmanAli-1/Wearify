"use client";

import Image from "next/image";
import { Card, CardContent } from "@/ui/card";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";


export default function SignIn() {
    const router = useRouter();

    const [formloginData, setFormloginData] = useState(
        {
            email: "",
            password: "",
        });

    const handleChanges = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormloginData({
            ...formloginData,
            [e.target.name]: e.target.value
        });
    }

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const response = await fetch("http://localhost:4000/api/users/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(formloginData),
        })

        const data = await response.json();

        if (response.ok) {
            window.dispatchEvent(new Event("auth-changed"));
            router.push("/");
        }
        else {
            console.log(data.message);
        }

    }
    return (
        <>
            <section className="bg-[#F5F5DC] h-full">
                <div className="h-full w-full pt-27 flex items-center justify-center ">
                    <div className="max-w-5xl w-full flex flex-col md:flex-row items-center justify-between px-4 md:px-12 md:gap-45">

                        {/* LEFT SIDE */}
                        <div className="-top-20 flex flex-col items-center justify-center text-center w-full h-full md:w-1/2">

                            {/* Bigger Side Logo */}
                            <Image
                                src="/images/logo3.png"
                                alt="Side Logo"
                                width={340}
                                height={340}
                                className="hidden md:block md:w-64 lg:w-80 object-contain md:mb-4 mx-auto"
                            />


                            <p className="md:block hidden text-sm text-gray-600">
                                Don’t have an account?
                                <a href="/signup" className="text-blue-600 ml-1 font-medium hover:underline">
                                    Sign Up
                                </a>
                            </p>
                        </div>

                        {/* RIGHT SIDE - LOGIN CARD */}
                        <Card
                            className="w-full md:w-1/2 rounded-xl bg-gradient-to-r from-[#6B7A4C] to-[#F5F5DC] md:py-6 py-5
                    border-none shadow-2xl "
                        >
                            <CardContent className="">

                                {/* Gradient Login Text */}
                                <h2 className="md:text-4xl text-3xl font-bold text-center text-[#1C1C1C]/80  pb-8">
                                    Sign In
                                </h2>

                                <form onSubmit={handleLogin}>

                                    {/* Email */}
                                    <Input
                                        type="email"
                                        name="email"
                                        placeholder="Email"
                                        className="mb-4 bg-white"
                                        onChange={handleChanges}
                                        value={formloginData.email}
                                        required
                                    />

                                    {/* Password */}
                                    <Input
                                        type="password"
                                        name="password"
                                        placeholder="Password"
                                        className="mb-2 bg-white"
                                        onChange={handleChanges}
                                        value={formloginData.password}
                                        required
                                    />

                                    {/* Forgot Password */}
                                    <p className="text-center text-sm text-gray-700 mb-4 hover:underline cursor-pointer">
                                        Forget Password?
                                    </p>

                                    {/* Login Button */}
                                    <Button
                                        className="w-full py-2 mb-4 rounded-lg text-white font-semibold bg-gradient-to-r  from-[#4F5D3A] to-[#6B7A4C]/70"
                                        
                                        type="submit"
                                    >
                                        Sign In
                                    </Button>
                                </form>

                                {/* OR */}
                                <div className="flex items-center my-4">
                                    <div className="flex-1 h-[1px] bg-gray-400" />
                                    <span className="px-4 text-gray-700">OR</span>
                                    <div className="flex-1 h-[1px] bg-gray-400" />
                                </div>

                                {/* Google Login */}
                                <Button
                                    variant="outline"
                                    className="w-full mb-3 flex items-center justify-center gap-3 bg-white"
                                >
                                    <Image
                                        src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg"
                                        width={22}
                                        height={22}
                                        alt="Google"
                                    />
                                    Continue With Google
                                </Button>

                                {/* Apple Login */}
                                <Button
                                    variant="outline"
                                    className="w-full flex items-center justify-center gap-3 bg-white"
                                >
                                    <Image
                                        src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/apple/apple-original.svg"
                                        width={22}
                                        height={22}
                                        alt="Apple"
                                    />
                                    Continue With Apple
                                </Button>

                                {/* Register Link */}
                                <p className="text-center text-sm mt-6 text-black">
                                    Don’t have an account?
                                    <a href="/signup" className="text-blue-600 ml-1 font-medium hover:underline">
                                        Sign Up
                                    </a>
                                </p>

                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>
        </>
    );

}
