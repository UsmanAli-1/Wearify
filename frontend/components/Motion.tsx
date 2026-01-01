"use client";

import { motion } from "framer-motion";

type Props = {
    children: React.ReactNode;
    variant?: any;
    className?: string;
};

export default function Motion({
    children,
    variant,
    className,
}: Props) {
    return (
        <motion.div
            variants={variant}
            initial="hidden"
            whileInView="show"
            viewport={{ once: false }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
