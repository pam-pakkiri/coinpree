"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const auth = localStorage.getItem("coinpree_auth");
        const publicPages = ["/login", "/signup", "/"];

        if (publicPages.includes(pathname)) {
            setIsAuthenticated(auth === "true");
            setIsLoading(false);
            return;
        }

        if (auth === "true") {
            setIsAuthenticated(true);
        } else {
            router.push("/login");
        }
        setIsLoading(false);
    }, [pathname, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated && !["/login", "/signup", "/"].includes(pathname)) {
        return null;
    }

    return <>{children}</>;
}
