"use client";

import Image from "next/image";
import { Card, CardContent } from "@/ui/card";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";
import { useState } from "react";
// import bcrypt from 'bcrypt';
import toast from "react-hot-toast";


export default function SignUp() {

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        points: "120",
    });

    const handleChanges = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Send data to backend
        const response = await fetch("http://localhost:4000/api/users", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
        })

        // Read backend response
        // const data = await response.json();
        // console.log("backend response :", data);

        if (response.ok) {
            setFormData({
                name: "",
                email: "",
                phone: "",
                password: "",
                points: "120",
            });
            toast.success("user created");
        }
    }
    return (
        <>
            <section>
                <div className="h-full pt-27 w-full flex items-center justify-center">
                    <div className="max-w-5xl w-full flex flex-col md:flex-row items-center justify-between px-4 md:px-12 md:gap-45">

                        {/* LEFT SIDE */}
                        <div className="flex flex-col items-center justify-center text-center w-full md:w-1/2">

                            {/* Logo */}
                            <Image
                                src="/images/logo3.png"
                                alt="Side Logo"
                                width={340}
                                height={340}
                                className="hidden md:block md:w-64 lg:w-80 object-contain md:mb-4 mx-auto"
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
                            className="w-full md:w-1/2 md:rounded-xl bg-gradient-to-r from-[#6B7A4C] to-[#F5F5DC] md:py-6  py-5
                    border-none shadow-2xl"
                        >
                            <CardContent>
                                <form onSubmit={handleSubmit} >

                                    {/* Title */}
                                    <h2 className="md:text-4xl text-3xl font-bold text-center bg-[#1C1C1C]/80 bg-clip-text text-transparent pb-6 ">
                                        Sign Up
                                    </h2>

                                    <Input
                                        type="hidden"
                                        name="points"
                                        value={formData.points}
                                    />
                                    {/* Full Name */}
                                    <label className="text-sm font-medium text-gray-800">Full Name</label>
                                    <Input
                                        placeholder="Enter your name"
                                        type="text"
                                        name="name"
                                        className="mb-4 bg-white"
                                        onChange={handleChanges}
                                        value={formData.name}
                                        required
                                    />

                                    {/* Email  */}
                                    <label className="text-sm font-medium text-gray-800">Email</label>
                                    <Input
                                        type="email"
                                        name="email"
                                        placeholder="Email"
                                        className="mb-4 bg-white"
                                        onChange={handleChanges}
                                        value={formData.email}
                                        required
                                    />

                                    {/* Phone */}
                                    <label className="text-sm font-medium text-gray-800">Phone Number</label>
                                    <Input
                                        type="tel"
                                        name="phone"
                                        placeholder="Phone Number"
                                        className="mb-4 bg-white"
                                        onChange={handleChanges}
                                        value={formData.phone}
                                        required
                                    />

                                    {/* Password */}
                                    <label className="text-sm font-medium text-gray-800">Password</label>
                                    <Input
                                        type="password"
                                        name="password"
                                        placeholder="Password"
                                        className="mb-8 bg-white"
                                        onChange={handleChanges}
                                        value={formData.password}
                                        required
                                    />

                                    {/* Create Account Button */}
                                    <Button
                                        className="w-full py-2 mb-4 rounded-lg text-white font-semibold bg-gradient-to-r  from-[#4F5D3A] to-[#6B7A4C]/70"
                                        type="submit"
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
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>
        </>
    );
}
