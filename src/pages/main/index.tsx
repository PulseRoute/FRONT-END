import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ArrowRight } from "lucide-react";

const sections = [
    {
        title: "PulseRoute",
        subtitle: "AI-Powered Emergency Navigation",
        description: "Mapping the Golden Hour for Emergency Medical Services",
    },
    {
        title: "Real-time Hospital Data",
        subtitle: "Live Availability Tracking",
        description:
            "Monitor ER bed capacity, wait times, and specialist availability in real-time",
    },
    {
        title: "Smart Patient Routing",
        subtitle: "AI-Driven Triage System",
        description: "Intelligent patient classification and optimal transport route suggestions",
    },
    {
        title: "Rapid Medical Connection",
        subtitle: "Saving the Golden Hour",
        description: "Fast and accurate emergency medical system to protect critical time windows",
        showButton: true,
    },
];

const MainPage = () => {
    const [currentSection, setCurrentSection] = useState(0);
    const [isScrolling, setIsScrolling] = useState(false);

    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();

            if (isScrolling) return;

            const direction = e.deltaY > 0 ? 1 : -1;
            const nextSection = currentSection + direction;

            if (nextSection >= 0 && nextSection < sections.length) {
                setIsScrolling(true);
                setCurrentSection(nextSection);
                setTimeout(() => setIsScrolling(false), 800);
            } else if (nextSection >= sections.length) {
                setIsScrolling(true);
                setCurrentSection(0);
                setTimeout(() => setIsScrolling(false), 800);
            } else if (nextSection < 0) {
                setIsScrolling(true);
                setCurrentSection(sections.length - 1);
                setTimeout(() => setIsScrolling(false), 800);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (isScrolling) return;

            if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                e.preventDefault();
                setIsScrolling(true);
                setCurrentSection((prev) =>
                    prev >= sections.length - 1 ? 0 : prev + 1,
                );
                setTimeout(() => setIsScrolling(false), 800);
            } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                e.preventDefault();
                setIsScrolling(true);
                setCurrentSection((prev) =>
                    prev <= 0 ? sections.length - 1 : prev - 1,
                );
                setTimeout(() => setIsScrolling(false), 800);
            }
        };

        // Touch swipe support
        let touchStartY = 0;
        const handleTouchStart = (e: TouchEvent) => {
            touchStartY = e.touches[0].clientY;
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (isScrolling) return;

            const touchEndY = e.changedTouches[0].clientY;
            const diff = touchStartY - touchEndY;

            if (Math.abs(diff) > 50) {
                setIsScrolling(true);
                if (diff > 0) {
                    // Swipe up (next)
                    setCurrentSection((prev) =>
                        prev >= sections.length - 1 ? 0 : prev + 1,
                    );
                } else {
                    // Swipe down (previous)
                    setCurrentSection((prev) =>
                        prev <= 0 ? sections.length - 1 : prev - 1,
                    );
                }
                setTimeout(() => setIsScrolling(false), 800);
            }
        };

        window.addEventListener("wheel", handleWheel, { passive: false });
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("touchstart", handleTouchStart);
        window.addEventListener("touchend", handleTouchEnd);

        return () => {
            window.removeEventListener("wheel", handleWheel);
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchend", handleTouchEnd);
        };
    }, [currentSection, isScrolling]);

    const section = sections[currentSection];

    return (
        <div className="relative h-screen overflow-hidden">
            {/* Fixed Background */}
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('/banner/main.webp')` }}
            >
                <div className="absolute inset-0 bg-black/50" />
            </div>

            {/* Fixed Header */}
            <Header />

            {/* Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentSection}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -40 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4"
                >
                    <motion.h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
                        {section.title}
                        {section.subtitle && (
                            <>
                                <br />
                                <span className="text-3xl md:text-5xl font-medium text-white/90">
                                    {section.subtitle}
                                </span>
                            </>
                        )}
                    </motion.h1>

                    {section.description && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="mt-6 text-lg md:text-xl text-white/80 max-w-xl"
                        >
                            {section.description}
                        </motion.p>
                    )}

                    {section.showButton && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="mt-10"
                        >
                            <Link to="/login">
                                <Button
                                    variant="ghost"
                                    className="bg-white/10 backdrop-blur-sm text-white border border-white/30 rounded-full px-8 py-5 text-base font-medium hover:bg-white/20 hover:border-white/50 hover:text-white transition-all duration-300"
                                >
                                    Get Started
                                    <ArrowRight className="size-4 ml-2" />
                                </Button>
                            </Link>
                        </motion.div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Section Indicator (Right) */}
            <div className="fixed right-6 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
                {sections.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => {
                            if (!isScrolling) {
                                setIsScrolling(true);
                                setCurrentSection(index);
                                setTimeout(() => setIsScrolling(false), 800);
                            }
                        }}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            index === currentSection
                                ? "bg-white scale-125"
                                : "bg-white/40 hover:bg-white/60"
                        }`}
                    />
                ))}
            </div>

            {/* Scroll Indicator (Bottom) */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20"
            >
                <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="flex flex-col items-center text-white/60"
                >
                    <span className="text-sm mb-2">
                        {currentSection === sections.length - 1
                            ? "Back to Top"
                            : "Scroll"}
                    </span>
                    <ChevronDown className="size-5" />
                </motion.div>
            </motion.div>
        </div>
    );
};

export default MainPage;
