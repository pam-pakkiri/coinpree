"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
    Lock,
    User,
    ArrowRight,
    X,
    Eye,
    EyeOff,
    Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

export default function SignupPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        setTimeout(() => {
            setIsLoading(false);
            router.push("/login");
        }, 1500);
    };

    return (
        <div className="flex min-h-screen bg-[#0b0e11] items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-[400px] bg-[#1a1e23] border border-[#2d333b] rounded-xl shadow-2xl relative overflow-hidden"
            >
                {/* Close Button */}
                <button className="absolute right-4 top-5 text-[#8b949e] hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                </button>

                {/* Tabs */}
                <div className="pt-6 px-6 flex gap-6">
                    <Link href="/login" className="pb-3 group">
                        <span className="text-lg font-bold text-[#8b949e] group-hover:text-white transition-colors cursor-pointer select-none">Log In</span>
                    </Link>
                    <div className="relative pb-3">
                        <span className="text-lg font-bold text-white cursor-pointer select-none">Sign Up</span>
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                    </div>
                </div>

                <div className="p-6">
                    <AnimatePresence mode="wait">
                        {isLoading ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="py-12 text-center space-y-4"
                            >
                                <div className="inline-block w-8 h-8 border-2 border-white/5 border-t-blue-500 rounded-full animate-spin" />
                                <div className="text-[10px] font-bold text-white tracking-widest uppercase opacity-60">Initializing...</div>
                            </motion.div>
                        ) : (
                            <motion.form
                                key="form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onSubmit={handleSignup}
                                className="space-y-5"
                            >
                                <div className="space-y-4">
                                    {/* Name */}
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[12px] font-bold text-white opacity-90">Full Name</label>
                                        <Input
                                            type="text"
                                            placeholder="Enter your name..."
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="h-11 bg-[#0d1117]/50 border-[#2d333b] text-white focus:border-blue-500 rounded-md text-[13px] placeholder:text-[#484f58] transition-all"
                                            required
                                        />
                                    </div>

                                    {/* Email Address */}
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[12px] font-bold text-white opacity-90">Email Address</label>
                                        <Input
                                            type="email"
                                            placeholder="Enter your email address..."
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="h-11 bg-[#0d1117]/50 border-[#2d333b] text-white focus:border-blue-500 rounded-md text-[13px] placeholder:text-[#484f58] transition-all"
                                            required
                                        />
                                    </div>

                                    {/* Password */}
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[12px] font-bold text-white opacity-90">Create Password</label>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Create a password..."
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

                                <Button
                                    type="submit"
                                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-md transition-all active:scale-[0.98]"
                                >
                                    Sign Up
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
                </div>
            </motion.div>
        </div>
    );
}
