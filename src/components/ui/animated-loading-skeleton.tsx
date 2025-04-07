
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from "@/components/ui/card";

interface AnimatedLoadingSkeletonProps {
    numCards?: number;
}

const AnimatedLoadingSkeleton = ({ numCards = 1 }: AnimatedLoadingSkeletonProps) => {
    // Variants for card animations
    const cardVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: (i: number) => ({
            y: 0,
            opacity: 1,
            transition: { delay: i * 0.1, duration: 0.4 }
        })
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(numCards)].map((_, i) => (
                <Card
                    key={i}
                    className="bg-slate-800/80 border border-white/5 shadow-sm h-[220px] flex flex-col"
                >
                    <motion.div
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        custom={i}
                        className="p-6 h-full flex flex-col"
                    >
                        {/* Card content */}
                        <div className="flex justify-between items-center mb-4">
                            <motion.div
                                className="h-5 w-32 bg-slate-700/80 rounded"
                                animate={{
                                    background: ["#334155", "#475569", "#334155"],
                                }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            />
                        </div>
                        
                        <div className="space-y-4 flex-1">
                            <div>
                                <motion.div
                                    className="h-3 w-16 bg-slate-700/80 rounded mb-2"
                                    animate={{
                                        background: ["#334155", "#475569", "#334155"],
                                    }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                                <motion.div
                                    className="h-5 w-3/4 bg-slate-700/80 rounded"
                                    animate={{
                                        background: ["#334155", "#475569", "#334155"],
                                    }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                            </div>
                            
                            <div>
                                <motion.div
                                    className="h-3 w-16 bg-slate-700/80 rounded mb-2"
                                    animate={{
                                        background: ["#334155", "#475569", "#334155"],
                                    }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                                <motion.div
                                    className="h-5 w-1/2 bg-slate-700/80 rounded"
                                    animate={{
                                        background: ["#334155", "#475569", "#334155"],
                                    }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                            </div>
                        </div>
                        
                        <motion.div
                            className="h-4 w-32 bg-slate-700/80 rounded mt-4"
                            animate={{
                                background: ["#334155", "#475569", "#334155"],
                            }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        />
                    </motion.div>
                </Card>
            ))}
        </div>
    );
};

export default AnimatedLoadingSkeleton;
