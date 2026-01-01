"use client";

import { Card, CardContent } from "@/ui/card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCube,
    faRulerCombined,
    faWandMagicSparkles,
    faLayerGroup,
    faShareNodes,
} from "@fortawesome/free-solid-svg-icons";
import Motion from "@/components/Motion";
import { fadeUp } from "@/lib/motion";
import { fadeIn } from "@/lib/motion";
import { popUp } from "@/lib/motion";
import { popUpslow } from "@/lib/motion";

export default function AiPoweredFeatures() {
    const features = [
        {
            icon: faCube,
            title: "2D Virtual Fitting",
            desc: "Upload your photos and see clothes on your body instantly. Our AI adapts to your body shape and posture for realistic results.",
        },
        {
            icon: faWandMagicSparkles,
            title: "Style Recommendations",
            desc: "Get personalized outfit suggestions based on your preferences, body type, and skin tone.",
        },
        {
            icon: faLayerGroup,
            title: "Mix & Match Outfits",
            desc: "Combine different pieces virtually to create complete looks. See how  tops, bottoms work together.",
        },
        {
            icon: faShareNodes,
            title: "Social Sharing",
            desc: "Share your virtual looks with your friends and get instant feedback before making a purchase decision.",
        },
    ];

    return (
        <section className="w-full px-6 md:px-20 py-13 bg-[#F5F5DC]">
            <Motion variant={fadeUp}>
                <h2 className="text-center md:text-4xl text-3xl font-bold mb-3 text-[#1C1C1C]">
                    AI-Powered Features
                </h2>
            </Motion>
            <Motion variant={fadeIn}>
                <p className="text-center text-gray-500 mb-12">
                    Experience cutting-edge technology that revolutionizes how you shop for clothes online
                </p>
            </Motion>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-8">
                {features.map((feat, i) => (
                    <Motion variant={popUpslow}>
                        <Card
                            key={i}
                            className="shadow-xl transition hover:scale-105 duration-300 border-none"
                            style={{
                                background: "linear-gradient(135deg,  #6B7A4C 0%, #F5F5DC 100%)",
                            }}
                        >
                            <CardContent className=" "

                            >
                                {/* Gradient Icon */}
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white text-xl shadow-lg"
                                    style={{
                                        background: "linear-gradient(135deg, #4F5D3A 0%, #6B7A4C 100%)",
                                    }}
                                >
                                    <FontAwesomeIcon icon={feat.icon} />
                                </div>

                                <h3 className="font-semibold text-lg mb-2 text-[#1C1C1C]/90">{feat.title}</h3>
                                <p className="text-gray-700 text-sm leading-relaxed ">{feat.desc}</p>
                            </CardContent>
                        </Card>
                    </Motion>
                ))}
            </div>
        </section>
    );
}
