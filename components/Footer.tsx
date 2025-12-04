"use client";

import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFacebookF,
    faInstagram,
    faTwitter,
    faLinkedinIn,
} from "@fortawesome/free-brands-svg-icons";

export default function Footer() {
    return (
        <footer className="w-full bg-gradient-to-r from-[#C8B8FF] to-[#E9D2E7]/20" >
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">

                {/* === TOP GRID === */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-24">

                    {/* LOGO + DESCRIPTION */}
                    <div className="space-y-3">
                        <div className="flex items-center">
                            {/* Logo Image */}
                            <div className=" flex items-center justify-center">
                                <Image
                                    src="/images/logo1.png"
                                    alt="Wearify Logo"
                                    width={65}
                                    height={0}
                                    className=""
                                />
                            </div>

                        </div>

                        <p className="text-gray-600 text-sm max-w-xs">
                            Revolutionizing online fashion shopping with AI-powered virtual try-ons.
                        </p>

                        {/* SOCIAL ICONS */}
                        <div className="flex gap-2 pt-2">
                            <a className="text-gray-700 hover:text-gray-900 transition">
                                <FontAwesomeIcon icon={faFacebookF} className="w-4 h-4" />
                            </a>
                            <a className="text-gray-700 hover:text-gray-900 transition">
                                <FontAwesomeIcon icon={faInstagram} className="w-4 h-4" />
                            </a>
                            <a className="text-gray-700 hover:text-gray-900 transition">
                                <FontAwesomeIcon icon={faTwitter} className="w-4 h-4" />
                            </a>
                            <a className="text-gray-700 hover:text-gray-900 transition">
                                <FontAwesomeIcon icon={faLinkedinIn} className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                    {/* PRODUCT LINKS */}
                    <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Product</h4>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li><a className="hover:text-gray-900" href="#tryon">AI Try-On</a></li>
                            <li><a className="hover:text-gray-900" href="about">Features</a></li>
                            <li><a className="hover:text-gray-900" href="howitwork">How It Works</a></li>
                            <li><a className="hover:text-gray-900" href="collection">Gallery</a></li>
                            {/* <li><a className="hover:text-gray-900" >Mobile App</a></li> */}
                        </ul>
                    </div>

                    {/* COMPANY LINKS */}
                    <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Company</h4>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li><a className="hover:text-gray-900" >About Us</a></li>
                            <li><a className="hover:text-gray-900">Careers</a></li>
                            <li><a className="hover:text-gray-900">Blog</a></li>
                        </ul>
                    </div>

                    {/* SUPPORT LINKS */}
                    <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Support</h4>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li><a className="hover:text-gray-900">Help Center</a></li>
                            <li><a className="hover:text-gray-900">Contact Us</a></li>
                            <li><a className="hover:text-gray-900">Privacy Policy</a></li>
                            <li><a className="hover:text-gray-900">Terms of Service</a></li>
                        </ul>
                    </div>
                </div>

                {/* DIVIDER */}
                <div className="mt-13 mb-8 border-t border-gray-300"></div>

                {/* BOTTOM COPYRIGHT */}
                <div className="text-sm text-gray-600">
                    © 2025 Wearify. Virtual AI Try-On.
                    <br />All rights reserved.
                </div>
            </div>
        </footer>
    );
}
