"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

export function useAlertSystem() {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("coinpree_alerts_enabled");
        if (stored === "true") setEnabled(true);
    }, []);

    const toggleAlerts = useCallback(() => {
        setEnabled(prev => {
            const next = !prev;
            localStorage.setItem("coinpree_alerts_enabled", String(next));
            if (next) {
                // Request Browser Notification Permission
                if ("Notification" in window) {
                    Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                            toast.success("Push Notifications Enabled", {
                                description: "You will receive system alerts even in other tabs."
                            });
                        }
                    });
                }

                toast.success("Alerts ACTIVE", {
                    description: "Sound and Notifications are now enabled for new detections.",
                    duration: 4000
                });
                // Play a test sound immediately so user knows it works
                const audio = new Audio("https://cdn.pixabay.com/audio/2022/03/15/audio_730623d262.mp3");
                audio.volume = 0.3;
                audio.play().catch(() => { });
            } else {
                toast.info("Alerts disabled");
            }
            return next;
        });
    }, []);

    const triggerAlert = useCallback((title: string, message: string) => {
        if (!enabled) return;

        // 1. Play Sound
        const playSound = () => {
            try {
                const audio = new Audio("https://cdn.pixabay.com/audio/2022/03/15/audio_730623d262.mp3");
                audio.volume = 0.4;
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(() => {
                        console.log("🔊 Audio autoplay was prevented.");
                    });
                }
            } catch (error) {
                console.error("Failed to play alert sound", error);
            }
        };
        playSound();

        // 2. Show Toast Notification (Visible if tab is active)
        toast(title, {
            description: message,
            duration: 8000,
        });

        // 3. Show System Notification (Visible even if tab is in background)
        if ("Notification" in window && Notification.permission === "granted") {
            try {
                const n = new Notification(title, {
                    body: message,
                    icon: "/coinpree.png", // Ensure this path is correct
                    tag: "coinpree-alert", // Overwrites previous notification of same tag to avoid spam
                    silent: true, // We play our own sound
                });

                n.onclick = () => {
                    window.focus();
                    n.close();
                };
            } catch (e) {
                console.error("Browser notification error:", e);
            }
        }
    }, [enabled]);

    return { enabled, toggleAlerts, triggerAlert };
}
