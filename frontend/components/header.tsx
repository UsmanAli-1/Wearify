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
        `relative transition ${pathname === "/" && activeSection === id
            ? "bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent font-semibold"
            : "text-black"
        }`;
    return (
        <header className="sticky top-0 z-50 w-full shadow-sm bg-white">
            <nav className="flex items-center justify-between px-8">
                {/* Logo */}
                <div>
                    <a href="/">
                        <Image
                            src="/images/logo1.png"
                            alt="Logo"
                            width={65}
                            height={0}
                            className="object-cover py-2"
                        />
                    </a>
                </div>

                {/* Desktop Links */}
                <div className="hidden md:flex gap-6 font-medium">
                    {links.map((link) => (
                        <a
                            key={link.id}
                            href={`/#${link.id}`} // ensures scroll to homepage sections
                            onClick={() => setActiveSection(link.id)} // works on homepage
                            className={linkClass(link.id)}
                        >
                            {link.label}
                            {pathname === "/" && activeSection === link.id && (
                                <span className="absolute left-0 -bottom-0.5 w-full h-[2px] bg-gradient-to-r from-purple-500 to-pink-500 rounded transition-all duration-300"></span>
                            )}
                        </a>
                    ))}
                </div>

                {/* Desktop Button */}
                <div className=" md:flex items-center gap-4">
                    {/* Points Box */}
                    {user?.points != null && (
                        <div className="flex items-center gap-2 bg-black text-white px-3 py-1 rounded-lg">
                            <FontAwesomeIcon icon={faGem} className="text-purple-400 text-sm" />
                            <span className="text-sm font-medium">{user.points}</span>
                        </div>
                    )}

                    {/* Sign In signout Button */}
                    {user ? (
                        <Button
                            onClick={handleSignOut}
                            variant="secondary"
                            className="hidden md:block rounded-full bg-gradient-to-r from-purple-500/40 to-pink-500/40 text-black hover:scale-105 duration-300 "
                        >
                            Sign Out
                        </Button>
                    ) : (
                        <Button
                            variant="secondary"
                            className="hidden md:block rounded-full bg-gradient-to-r from-purple-500/40 to-pink-500/40 text-black hover:scale-105 duration-300">
                            <a href="/signin">Sign In / Sign Up</a>
                        </Button>
                    )}


                </div>


                {/* Mobile Hamburger */}
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
                            href={`/#${link.id}`} // scroll to homepage section
                            onClick={() => setActiveSection(link.id)}
                            className={linkClass(link.id)}
                        >
                            {link.label}
                            {pathname === "/" && activeSection === link.id && (
                                <span className="bg-gradient-to-r from-purple-500 to-pink-500 rounded"></span>
                            )}
                        </a>
                    ))}
                </div>
                <div className="flex flex-col gap-4 px-6 pr-9 font-medium">
                    {user ? (
                        <Button className="rounded-full bg-gradient-to-r from-purple-500/40 to-pink-500/40 hover:bg-purple-500/30 text-black hover:scale-105 duration-300 mt-2"
                            onClick={handleSignOut}
                        >
                            Sign Out
                        </Button>
                    ) : (
                        <Button className="rounded-full bg-gradient-to-r from-purple-500/40 to-pink-500/40 hover:bg-purple-500/30 text-black hover:scale-105 duration-300 mt-2">
                            <a href="/signin">Sign In/Sign Up</a>
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}
