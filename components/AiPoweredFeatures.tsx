"use client";

import { Card, CardContent } from "@/ui/card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCube,
    faRulerCombined,
    faWandMagicSparkles,
    faLayerGroup,
    faVrCardboard,
    faShareNodes,
} from "@fortawesome/free-solid-svg-icons";

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
        <section className="w-full px-6 md:px-20 py-13">
            <h2 className="text-center md:text-4xl text-3xl font-bold mb-3">
                AI-Powered Features
            </h2>
            <p className="text-center text-gray-500 mb-12">
                Experience cutting-edge technology that revolutionizes how you shop for clothes online
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-8">
                {features.map((feat, i) => (
                    <Card
                        key={i}
                        className="shadow-md  border border-gray-300/20 bg-white hover:shadow-md transition hover:scale-105 duration-300"
                        style={{
                            background: "linear-gradient(135deg, #FDF3F8 0%, #FFFFFF 100%)",
                        }}
                    >
                        <CardContent className=" "

                        >
                            {/* Gradient Icon */}
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white text-xl"
                                style={{
                                    background: "linear-gradient(135deg, #A86CE3 0%, #EF5BA1 100%)",
                                }}
                            >
                                <FontAwesomeIcon icon={feat.icon} />
                            </div>

                            <h3 className="font-semibold text-lg mb-2">{feat.title}</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">{feat.desc}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>
    );
}
