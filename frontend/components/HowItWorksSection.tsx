"use client";

import { Card, CardContent } from "@/ui/card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera, faShirt, faWandMagicSparkles } from "@fortawesome/free-solid-svg-icons";

export default function HowItWorks() {
    const steps = [
        {
            icon: faCamera,
            title: "Upload Your Photo",
            desc: "Take or upload a full-body photo. Our AI will analyze your body shape and measurements automatically.",
        },
        {
            icon: faShirt,
            title: "Select Garment",
            desc: "Choose any clothing item you want to try. Browse tops, bottoms, dresses, jackets and more.",
        },
        {
            icon: faWandMagicSparkles,
            title: "Generate Virtual Try-On",
            desc: "Click generate and watch the magic happen. See yourself wearing the selected outfit instantly.",
        },
    ];

    return (
        <section
            className="w-full py-15 px-6 md:px-24 rounded-2xl"
            style={{
                background: "linear-gradient(135deg, #F5F5DC 0%, #6B7A4C 100%)",
            }}
        >
            {/* Section Title */}
            <div className="text-center mb-10">
                <h2 className="md:text-4xl text-3xl font-bold text-[#1C1C1C]/90">How It Works</h2>
                <p className="text-gray-700 max-w-xl mx-auto py-3">
                    Get started in three simple steps and transform your shopping experience
                </p>
            </div>

            {/* Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center ">
                {steps.map((step, index) => (
                    <Card
                        key={index}
                        className="shadow-none py-0 bg-transparent border-none flex items-center text-center"
                    >
                        <CardContent className="flex flex-col items-center justify-center">

                            {/* Gradient Icon Circle */}
                            <div
                                className="w-16 h-16 rounded-full bg-[#1C1C1C]/80 flex items-center justify-center text-[#F5F5DC] text-2xl mb-5 shadow"
                                // style={{
                                //     background: "linear-gradient(135deg, #A86CE3 0%, #EF5BA1 100%)",
                                // }}
                            >
                                <FontAwesomeIcon icon={step.icon} />
                            </div>

                            {/* Title */}
                            <h3 className="text-lg font-semibold mb-2 text-[#1C1C1C]/90">{step.title}</h3>

                            {/* Description */}
                            <p className="text-gray-700 text-sm leading-relaxed max-w-xs">
                                {step.desc}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>
    );
}
