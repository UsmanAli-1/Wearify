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

        <div className="h-140 w-full flex items-center justify-center ">
            <div className="max-w-5xl w-full flex flex-col md:flex-row items-center justify-between px-6 md:px-12 md:gap-45">

                {/* LEFT SIDE */}
                <div className="-top-20 flex flex-col items-center justify-center text-center w-full md:w-1/2">


                    <h1 className="hidden md:block text-5xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent pb-4">
                        Wearify
                    </h1>

                    {/* Bigger Side Logo */}
                    <Image
                        src="/images/sidelogo.png"
                        alt="Side Logo"
                        width={240}
                        height={240}
                        className="w-10 sm:w-40 md:w-64 lg:w-60 object-contain md:mb-4 mx-auto"
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
                    className="w-full md:w-1/2 md:rounded-xl md:shadow-xl md:bg-gradient-to-r from-[#C3A5FF] to-[#F9D9C7] md:py-6 py-0
                    border-none shadow-none "
                >
                    <CardContent className="">

                        {/* Gradient Login Text */}
                        <h2 className="md:text-4xl text-3xl font-bold text-center bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent pb-8">
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
                                className="w-full py-2 mb-4 rounded-lg text-white font-semibold"
                                style={{
                                    background: "linear-gradient(90deg, #5AA5E8, #9B35E4)",
                                }}
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
    );
}
