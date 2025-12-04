"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { Button } from "@/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faXmark } from "@fortawesome/free-solid-svg-icons";

export default function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeSection, setActiveSection] = useState("home");

    const toggleMenu = () => setIsOpen(!isOpen);

    // Detect visible section
    useEffect(() => {
        const sections = ["home", "about", "howitwork", "collection"];

        const observers = sections.map((id) => {
            const element = document.getElementById(id);
            if (!element) return;

            const observer = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting) {
                        setActiveSection(id);
                    }
                },
                { threshold: 0.5 }
            );

            observer.observe(element);
            return observer;
        });

        return () => {
            observers.forEach((observer) => observer?.disconnect());
        };
    }, []);

    const links = [
        { id: "home", label: "Home" },
        { id: "about", label: "About" },
        { id: "howitwork", label: "How It Work" },
        { id: "collection", label: "Collection" },
    ]

    // Utility to check active
    const linkClass = (id: string) =>
        `relative transition ${activeSection === id
            ? "bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent font-semibold "
            : "text-black"
        }`;

    return (
        <header className="sticky top-0 z-50 w-full shadow-sm bg-white">
            <nav className="flex items-center justify-between px-8">
                {/* Logo */}
                <div>
                    <Image
                        src="/images/logo1.png"
                        alt="Logo"
                        width={65}
                        height={0}
                        className="object-cover py-2"
                    />
                </div>

                {/* Desktop Links */}
                <div className="hidden md:flex gap-6 font-medium">
                    {links.map((link) => (
                        <a
                            key={link.id}
                            href={`#${link.id}`}
                            onClick={() => setActiveSection(link.id)}
                            className={linkClass(link.id)}
                        >
                            {link.label}
                            {activeSection === link.id && (
                                <span className="absolute left-0 bottom-0 w-full h-[2px] bg-gradient-to-r from-purple-500 to-pink-500 rounded transition-all duration-300"></span>
                            )}
                        </a>
                    ))}
                </div>
                {/* <a href="#home" className={linkClass("home")}>Home</a>
                    <a href="#about" className={linkClass("about")}>About</a>
                    <a href="#howitwork" className={linkClass("howitwork")}>How it Works</a>
                    <a href="#collection" className={linkClass("collection")}>Collection</a> */}

                {/* Desktop Button */}
                <div className="hidden md:block">
                    <Button className="rounded-full bg-[#F7DDE2] hover:bg-purple-500/30 text-black hover:scale-105 duration-300">
                        Sign In/Sign Up
                    </Button>
                </div>

                {/*  Hamburger */}
                <div className="md:hidden">
                    <Button
                        variant="outline"
                        onClick={toggleMenu}
                        className="p-2 rounded-md hover:bg-gray-100 transition"
                    >
                        <FontAwesomeIcon icon={isOpen ? faXmark : faBars} size="lg" />
                    </Button>
                </div>
            </nav>

            {/* Mobile Menu */}
            <div
                className={`md:hidden bg-white shadow-md transition-all duration-300 overflow-hidden ${isOpen ? "max-h-screen py-4 " : "max-h-0"
                    }`}
            >
                <div className="flex flex-col gap-4 px-6 font-medium">
                    {links.map((link) => (
                        <a
                            key={link.id}
                            href={`#${link.id}`}
                            onClick={() => setActiveSection(link.id)}
                            className={linkClass(link.id)}
                        >
                            {link.label}
                            {activeSection === link.id && (
                                <span className=" bg-gradient-to-r from-purple-500 to-pink-500 rounded " ></span>
                            )}
                        </a>
                    ))}
                </div>
                <div className="flex flex-col gap-4 px-6 pr-9  font-medium">
                    <Button className="rounded-full bg-[#F7DDE2] hover:bg-purple-500/30 text-black hover:scale-105 duration-300 mt-2">
                        Sign In/Sign Up
                    </Button>
                </div>
            </div>
        </header>
    );
}


