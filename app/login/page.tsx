"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
    Lock,
    User,
    ArrowRight,
    X,
    Eye,
    EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const VALID_USER = "admin123";
    const VALID_PASS = "redsand@2026";

    useEffect(() => {
        if (localStorage.getItem("coinpree_auth") === "true") {
            router.push("/exchange-futures");
        }
    }, [router]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (username === VALID_USER && password === VALID_PASS) {
            setIsLoading(true);
            let currentProgress = 0;
            const interval = setInterval(() => {
                currentProgress += Math.floor(Math.random() * 15) + 5;
                if (currentProgress > 100) currentProgress = 100;
                setProgress(currentProgress);

                if (currentProgress === 100) {
                    clearInterval(interval);
                    localStorage.setItem("coinpree_auth", "true");
                    setTimeout(() => router.push("/exchange-futures"), 300);
                }
            }, 60);
        } else {
            setError("Invalid credentials");
        }
    };

    return (
        <div className="flex min-h-screen bg-[#0b0e11] items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-[400px] bg-[#1a1e23] border border-[#2d333b] rounded-xl shadow-2xl relative overflow-hidden min-h-[460px]"
            >
                {/* Close Button */}
                <button className="absolute right-4 top-5 text-[#8b949e] hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                </button>

                {/* Tabs */}
                <div className="pt-6 px-6 flex gap-6 border-b border-[#2d333b]/30">
                    <div className="relative pb-3">
                        <span className="text-lg font-bold text-white cursor-pointer select-none">Log In</span>
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                    </div>
                    <Link href="/signup" className="pb-3 group">
                        <span className="text-lg font-bold text-[#8b949e] group-hover:text-white transition-colors cursor-pointer select-none">Sign Up</span>
                    </Link>
                </div>

                <div className="p-6">
                    <AnimatePresence mode="wait">
                        {isLoading ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="py-16 flex flex-col items-center justify-center space-y-8"
                            >
                                {/* Modern Circular Loader with Progress */}
                                <div className="relative w-24 h-24">
                                    <svg className="w-full h-full rotate-[-90deg]">
                                        <circle
                                            cx="48"
                                            cy="48"
                                            r="40"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="transparent"
                                            className="text-[#2d333b]"
                                        />
                                        <motion.circle
                                            cx="48"
                                            cy="48"
                                            r="40"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="transparent"
                                            strokeDasharray="251.2"
                                            initial={{ strokeDashoffset: 251.2 }}
                                            animate={{ strokeDashoffset: 251.2 - (251.2 * progress) / 100 }}
                                            className="text-blue-500"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-xl font-bold text-white tracking-tighter">{progress}%</span>
                                    </div>
                                </div>

                                <div className="space-y-2 text-center">
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-[12px] font-bold text-white tracking-[0.2em] uppercase"
                                    >
                                        Synchronizing
                                    </motion.div>
                                    <div className="text-[10px] text-[#8b949e] uppercase font-medium tracking-widest">
                                        Establishing Secure Session
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.form
                                key="form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onSubmit={handleLogin}
                                className="space-y-5"
                            >
                                <div className="space-y-4">
                                    {/* Operator ID */}
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[12px] font-bold text-white opacity-90">Operator ID</label>
                                        <Input
                                            type="text"
                                            placeholder="Enter your operator ID..."
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="h-11 bg-[#0d1117]/50 border-[#2d333b] text-white focus:border-blue-500 rounded-md text-[13px] placeholder:text-[#484f58] transition-all"
                                            required
                                        />
                                    </div>

                                    {/* Password */}
                                    <div className="space-y-1.5 text-left">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[12px] font-bold text-white opacity-90">Password</label>
                                            <Link href="#" className="text-[11px] font-medium text-[#8b949e] hover:text-white transition-colors">Forgot password?</Link>
                                        </div>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Enter your password..."
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="h-11 bg-[#0d1117]/50 border-[#2d333b] text-white focus:border-blue-500 rounded-md text-[13px] placeholder:text-[#484f58] transition-all"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#484f58] hover:text-[#8b949e] transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <div className="text-red-500 text-[11px] font-bold text-center bg-red-500/5 p-2 rounded border border-red-500/10">
                                        {error}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-md transition-all active:scale-[0.98]"
                                >
                                    Log In
                                </Button>

                                <div className="relative flex items-center justify-center py-1">
                                    <div className="w-full border-t border-[#2d333b]" />
                                    <span className="absolute bg-[#1a1e23] px-3 text-[9px] font-bold text-[#8b949e] uppercase tracking-widest">OR</span>
                                </div>

                                {/* Google Auth Option - Compact */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full h-11 bg-transparent border-[#2d333b] hover:bg-white/5 text-white rounded-md gap-3 font-semibold text-xs transition-all"
                                >
                                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-4 h-4" alt="Google" />
                                    Continue with Google
                                </Button>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div> status-bar
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#2d333b]/20 overflow-hidden">
                    {isLoading && (
                        <motion.div
                            className="h-full bg-blue-500/50"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                        />
                    )}
                </div>
            </motion.div>
        </div>
    );
}
