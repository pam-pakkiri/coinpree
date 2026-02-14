
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Lock, User, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    // Hardcoded credentials as requested
    const VALID_USER = "admin123";
    const VALID_PASS = "redsand@2026";

    useEffect(() => {
        // If already logged in, redirect
        if (localStorage.getItem("coinpree_auth") === "true") {
            router.push("/");
        }
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (username === VALID_USER && password === VALID_PASS) {
            setSuccess(true);
            setIsLoading(true);

            // Simulate loading process 0-100%
            let width = 0;
            const interval = setInterval(() => {
                width += Math.floor(Math.random() * 10) + 5; // Random increment
                if (width > 100) width = 100;

                setProgress(width);

                if (width === 100) {
                    clearInterval(interval);
                    // Slight delay at 100% for effect
                    setTimeout(() => {
                        localStorage.setItem("coinpree_auth", "true");
                        router.push("/");
                    }, 800);
                }
            }, 100); // Update every 100ms
        } else {
            setError("Invalid credentials. Access Denied.");
            // Shake effect or red border logic can be added here
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-black text-white overflow-hidden relative selection:bg-indigo-500/30">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-black to-black opacity-80" />
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />

            {/* Animated Gradient Orb */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/20 blur-[120px] rounded-full animate-pulse pointer-events-none" />

            <div className="relative z-10 w-full max-w-sm p-8 space-y-8 glassmorphism bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl transition-all duration-500 hover:border-indigo-500/30 hover:shadow-indigo-500/10">

                {/* Header */}
                <div className="text-center space-y-6">
                    {/* CUSTOM BRAND MARK: COINPREE LOGO */}
                    <div className="relative inline-flex items-center justify-center mb-4 group cursor-pointer">
                        {/* 1. Behind Glow */}
                        <div className="absolute inset-0 bg-indigo-500/20 blur-[25px] rounded-2xl opacity-30 group-hover:opacity-60 transition-all duration-500" />

                        {/* 2. Logo Container */}
                        <div className="relative z-10 w-20 h-20 rounded-2xl bg-black shadow-xl overflow-hidden transition-transform duration-300 group-hover:scale-105">
                            <img
                                src="/coinpree.png"
                                alt="Coinpree Logo"
                                className="w-full h-full object-contain p-2"
                            />
                        </div>
                    </div>

                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
                            Welcome Back
                        </h1>
                        <p className="text-xs text-slate-400 font-medium">
                            Enter your credentials to access the terminal.
                        </p>
                    </div>
                </div>

                {isLoading ? (
                    // Modern Loader View
                    <div className="space-y-8 py-6 animate-in fade-in zoom-in duration-500">
                        <div className="relative pt-1">
                            <div className="flex mb-3 items-center justify-between">
                                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                                    System Initialization
                                </span>
                                <span className="text-[10px] font-bold text-indigo-400 font-mono">
                                    {progress}%
                                </span>
                            </div>
                            <Progress value={progress} className="h-1 bg-white/5" indicatorClassName="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_10px_2px_rgba(168,85,247,0.3)] transition-all duration-300 ease-out" />
                        </div>

                        <div className="space-y-3 pl-1">
                            {/* Loading Steps Visualization */}
                            <div className={cn("flex items-center gap-3 text-xs transition-all duration-300", progress > 20 ? "text-white" : "text-slate-600")}>
                                <div className={cn("w-1.5 h-1.5 rounded-full transition-all duration-500", progress > 20 ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" : "bg-slate-700")} />
                                <span className="tracking-wide">Verifying Identity Token...</span>
                            </div>
                            <div className={cn("flex items-center gap-3 text-xs transition-all duration-300", progress > 50 ? "text-white" : "text-slate-600")}>
                                <div className={cn("w-1.5 h-1.5 rounded-full transition-all duration-500", progress > 50 ? "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" : "bg-slate-700")} />
                                <span className="tracking-wide">Establishing Secure Link...</span>
                            </div>
                            <div className={cn("flex items-center gap-3 text-xs transition-all duration-300", progress > 80 ? "text-white" : "text-slate-600")}>
                                <div className={cn("w-1.5 h-1.5 rounded-full transition-all duration-500", progress > 80 ? "bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.8)]" : "bg-slate-700")} />
                                <span className="tracking-wide">Loading Neural Models...</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Login Form
                    <form onSubmit={handleLogin} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Operator ID</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-3.5 h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors duration-300" />
                                    <Input
                                        type="text"
                                        className="pl-11 h-12 bg-white/5 border-white/5 text-white placeholder:text-white/20 focus:border-indigo-500/50 focus:bg-white/10 focus:ring-1 focus:ring-indigo-500/20 transition-all duration-300 rounded-xl font-medium"
                                        placeholder="Enter ID"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Access Key</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-500 group-focus-within:text-purple-400 transition-colors duration-300" />
                                    <Input
                                        type="password"
                                        className="pl-11 h-12 bg-white/5 border-white/5 text-white placeholder:text-white/20 focus:border-purple-500/50 focus:bg-white/10 focus:ring-1 focus:ring-purple-500/20 transition-all duration-300 rounded-xl font-mono text-sm tracking-widest"
                                        placeholder="••••••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400 text-xs text-center font-medium animate-shake backdrop-blur-md">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-12 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white font-bold tracking-wide rounded-xl shadow-[0_0_20px_-5px_rgba(168,85,247,0.5)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-0"
                        >
                            Log In to Terminal <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    </form>
                )}
            </div>
        </div>
    );
}
