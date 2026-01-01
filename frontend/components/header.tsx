"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faXmark, faGem } from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/navigation";


export default function Header() {

    const router = useRouter();
    type User = {
        id: string;
        name: string;
        email: string;
        points: number;
    };


    const [user, setUser] = useState<User | null>(null)
    const [isOpen, setIsOpen] = useState(false);
    const [activeSection, setActiveSection] = useState("");
    const pathname = usePathname();


    const toggleMenu = () => setIsOpen(!isOpen);


    // get user data

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch("http://localhost:4000/api/users/me", {
                    credentials: "include",
                });

                if (!res.ok) {
                    setUser(null);
                    return;
                }

                const userData = await res.json();
                setUser(userData);
            } catch {
                setUser(null);
            }
        };

        // run once on load
        fetchUser();

        // run after login/logout
        window.addEventListener("auth-changed", fetchUser);

        return () => {
            window.removeEventListener("auth-changed", fetchUser);
        };
    }, []);



    // signout function 
    const handleSignOut = async () => {
        await fetch("http://localhost:4000/api/users/logout", {
            method: "POST",
            credentials: "include",
        });

        setUser(null);
        // window.dispatchEvent(new Event("auth-changed"));
        window.location.reload();
    };



    // Only detect sections on homepage
    useEffect(() => {
        if (pathname !== "/") return; // Do nothing on signin/signup pages

        const sections = ["home", "tryon", "about", "howitwork", "collection"];
        const observers: IntersectionObserver[] = [];

        sections.forEach((id) => {
            const element = document.getElementById(id);
            if (!element) return;

            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) setActiveSection(id);
                },
                { threshold: 0.5 }
            );
            observer.observe(element);
            observers.push(observer);
        });

        return () => observers.forEach((obs) => obs.disconnect());
    }, [pathname]);

    // linking and active section underline 
    const links = [
        { id: "home", label: "Home" },
        { id: "tryon", label: "Try On" },
        { id: "about", label: "About Us" },
        { id: "howitwork", label: "How It Work" },
        { id: "collection", label: "Collection" },
    ];

    const linkClass = (id: string) =>
        `px-2 py-1 rounded-md relative transition  ${pathname === "/" && activeSection === id
            ? "bg-gradient-to-r  from-[#4F5D3A] to-[#E6D5B8]/80 text-[#1C1C1C]/80 font-semibold"
            : "text-[#F5F5DC]"
        }`;

    const mobileLinkClass = (id: string) =>
        `px-4 py-2 rounded-xl transition ${pathname === "/" && activeSection === id
            ? "bg-gradient-to-r  from-[#4F5D3A] to-[#E6D5B8]/80 text-[#E6D5B8] font-semibold"
            : "text-[#F5F5DC]"
        }`;

    return (
        <header className="fixed top-5 left-0 right-0 z-50 flex justify-center pointer-events-none">
            {/* Header Card */}
            <div className="pointer-events-auto w-[92%] md:w-[80%] max-w-7xl bg-[#1C1C1C]/30 backdrop-blur-md rounded-2xl shadow-lg">
                <nav className="flex items-center justify-between px-6 md:px-8 ">

                    {/* Logo */}
                    <a href="/" className="flex items-center hover:scale-105  transition">
                        <Image
                            src="/images/logo5.png"
                            alt="Logo"
                            width={160}
                            height={0}
                            className="object-cover py-2"
                        />
                    </a>

                    {/* Desktop Links */}
                    <div className="hidden md:flex gap-6 font-medium relative ">
                        {links.map((link) => (
                            <a
                                key={link.id}
                                href={`/#${link.id}`}
                                onClick={() => setActiveSection(link.id)}
                                className={linkClass(link.id)}
                            >
                                {link.label}
                            </a>
                        ))}
                    </div>

                    {/* Right Section */}
                    <div className="flex items-center gap-4">

                        {/* Points */}
                        {user?.points != null && (
                            <div className="hidden md:flex items-center gap-2 bg-[#1C1C1C] text-[#E6D5B8] px-3 py-1 rounded-lg">
                                <FontAwesomeIcon icon={faGem} className="text-[#6B7A4C] text-sm" />
                                <span className="text-sm font-medium">{user.points}</span>
                            </div>
                        )}

                        {/* Auth Button */}
                        {user ? (
                            <Button
                                onClick={handleSignOut}
                                className="hidden md:block rounded-full bg-gradient-to-r from-[#4F5D3A] to-[#6B7A4C]
                                hover:from-[#3E4A2F] hover:to-[#5F6F3E] text-black hover:scale-105 duration-300"
                            >
                                Sign Out
                            </Button>
                        ) : (

                            <Button
                                variant="secondary"
                                className="hidden shadow-md md:block rounded-full bg-gradient-to-r from-[#4F5D3A] to-[#6B7A4C]
                                hover:from-[#3E4A2F] hover:to-[#5F6F3E] text-black hover:scale-105 duration-300"
                            >
                                <a href="/signin">Sign In / Sign Up</a>
                            </Button>
                        )}

                        {/* Mobile Menu Button */}
                        <div className="md:hidden">
                            <Button
                                variant="outline"
                                onClick={toggleMenu}
                                className="p-2 rounded-md bg-gradient-to-r  from-[#4F5D3A]/50 to-[#E6D5B8]/50 text-[#1C1C1C] border-none"
                            >
                                <FontAwesomeIcon icon={isOpen ? faXmark : faBars} size="lg" />
                            </Button>
                        </div>
                    </div>
                </nav>
            </div>

            {/* Mobile Menu */}
            <div
                className={`pointer-events-auto md:hidden fixed top-[95px] left-1/2 -translate-x-1/2 w-[92%] bg-[#1C1C1C]/30 backdrop-blur-md rounded-2xl shadow-lg overflow-hidden transition-all duration-300 ${isOpen ? "max-h-screen py-4" : "max-h-0"
                    }`}
            >
                <div className="flex flex-col  px-6 font-medium">
                    {links.map((link) => (
                        <a
                            key={link.id}
                            href={`/#${link.id}`}
                            onClick={() => {
                                setActiveSection(link.id);
                                toggleMenu();
                            }}
                            className={mobileLinkClass(link.id)}
                        >
                            {link.label}
                        </a>

                    ))}

                    {user ? (
                        <Button
                            onClick={handleSignOut}
                            className="rounded-full bg-gradient-to-r from-[#4F5D3A] to-[#6B7A4C] text-black mt-2"
                        >
                            Sign Out
                        </Button>
                    ) : (
                        <Button className="rounded-full bg-gradient-to-r from-[#4F5D3A] to-[#6B7A4C] text-black mt-2">
                            <a href="/signin">Sign In / Sign Up</a>
                        </Button>
                    )}
                </div>
            </div>
        </header>

    );
}
