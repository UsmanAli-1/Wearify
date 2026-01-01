"use client";

import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFacebookF,
    faInstagram,
    faTwitter,
    faLinkedinIn,
} from "@fortawesome/free-brands-svg-icons";
import Motion from "@/components/Motion";
import { fadeIn } from "@/lib/motion";
import { popUp } from "@/lib/motion";
import { popUpslow } from "@/lib/motion";

export default function Footer() {
    return (
        <footer className="w-full bg-gradient-to-r from-[#5F6F3E] to-[#9EAB7A]/80 " >
            <Motion variant={popUp}>
                <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">

                    {/* === TOP GRID === */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-24">

                        {/* LOGO + DESCRIPTION */}
                        <div className="space-y-3">
                            <div className="flex items-center">
                                {/* Logo Image */}
                                <Motion variant={popUpslow}>
                                    <div className=" flex items-center justify-center">
                                        <Image
                                            src="/images/logo5.png"
                                            alt="Wearify Logo"
                                            width={150}
                                            height={0}
                                            className=""
                                        />
                                    </div>
                                </Motion>

                            </div>

                            <p className="text-gray-700 text-sm max-w-xs">
                                Revolutionizing online fashion shopping with AI-powered virtual try-ons.
                            </p>

                            {/* SOCIAL ICONS */}
                            <div className="flex gap-2 pt-2">
                                <a className="text-gray-800 hover:text-gray-900 transition">
                                    <FontAwesomeIcon icon={faFacebookF} className="w-4 h-4" />
                                </a>
                                <a className="text-gray-800 hover:text-gray-900 transition">
                                    <FontAwesomeIcon icon={faInstagram} className="w-4 h-4" />
                                </a>
                                <a className="text-gray-800 hover:text-gray-900 transition">
                                    <FontAwesomeIcon icon={faTwitter} className="w-4 h-4" />
                                </a>
                                <a className="text-gray-800 hover:text-gray-900 transition">
                                    <FontAwesomeIcon icon={faLinkedinIn} className="w-4 h-4" />
                                </a>
                            </div>
                        </div>

                        {/* PRODUCT LINKS */}
                        <div>
                            <h4 className="text-lg font-semibold text-[#1C1C1C]/90 mb-4">Product</h4>
                            <ul className="space-y-3 text-sm text-gray-700">
                                <li><a className="hover:text-gray-900" href="#tryon">AI Try-On</a></li>
                                <li><a className="hover:text-gray-900" href="about">Features</a></li>
                                <li><a className="hover:text-gray-900" href="howitwork">How It Works</a></li>
                                <li><a className="hover:text-gray-900" href="collection">Gallery</a></li>
                                {/* <li><a className="hover:text-gray-900" >Mobile App</a></li> */}
                            </ul>
                        </div>

                        {/* COMPANY LINKS */}
                        <div>
                            <h4 className="text-lg font-semibold text-[#1C1C1C]/90 mb-4">Company</h4>
                            <ul className="space-y-3 text-sm text-gray-700">
                                <li><a className="hover:text-gray-900" >About Us</a></li>
                                <li><a className="hover:text-gray-900">Careers</a></li>
                                <li><a className="hover:text-gray-900">Blog</a></li>
                            </ul>
                        </div>

                        {/* SUPPORT LINKS */}
                        <div>
                            <h4 className="text-lg font-semibold text-[#1C1C1C]/90 mb-4">Support</h4>
                            <ul className="space-y-3 text-sm text-gray-700">
                                <li><a className="hover:text-gray-900">Help Center</a></li>
                                <li><a className="hover:text-gray-900">Contact Us</a></li>
                                <li><a className="hover:text-gray-900">Privacy Policy</a></li>
                                <li><a className="hover:text-gray-900">Terms of Service</a></li>
                            </ul>
                        </div>
                    </div>

                    {/* DIVIDER */}
                    <div className="mt-13 mb-8 border-t border-[#E6D5B8]"></div>

                    {/* BOTTOM COPYRIGHT */}
                    <Motion variant={fadeIn}>
                        <div className="text-sm text-gray-700">
                            © 2025 Wearify. Virtual AI Try-On.
                            <br />All rights reserved.
                        </div>
                    </Motion>
                </div>
            </Motion>
        </footer>
    );
}
