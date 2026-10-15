"use client";

import React, { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: (error: any) => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "flexible" | "compact";
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (err: any) => void;
  theme?: "light" | "dark" | "auto";
  className?: string;
}

// Cloudflare official test key that always passes in testing/development
const CF_DUMMY_ALWAYS_PASS_KEY = "1x00000000000000000000AA";

export function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
  theme = "auto",
  className = "",
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isScriptReady, setIsScriptReady] = useState(false);

  const siteKey =
    process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || CF_DUMMY_ALWAYS_PASS_KEY;

  useEffect(() => {
    // 1. Check if Turnstile is already loaded
    if (typeof window !== "undefined" && window.turnstile) {
      setIsScriptReady(true);
      return;
    }

    // 2. Load script if not already added
    const existingScript = document.getElementById("cf-turnstile-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "cf-turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setIsScriptReady(true);
      };
      document.head.appendChild(script);
    } else {
      const checkInterval = setInterval(() => {
        if (window.turnstile) {
          setIsScriptReady(true);
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }
  }, []);

  useEffect(() => {
    if (!isScriptReady || !containerRef.current || !window.turnstile) return;

    // Reset previous widget if any
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch (e) {
        // ignore cleanup error
      }
      widgetIdRef.current = null;
    }

    try {
      const id = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: theme,
        size: "flexible",
        callback: (token: string) => {
          onVerify(token);
        },
        "expired-callback": () => {
          onExpire?.();
        },
        "error-callback": (error: any) => {
          console.warn("Cloudflare Turnstile encountered an issue:", error);
          onError?.(error);
          // If in development mode with test key error, bypass gracefully
          if (siteKey === CF_DUMMY_ALWAYS_PASS_KEY) {
            onVerify("cf-turnstile-dummy-pass-token");
          }
        },
      });
      widgetIdRef.current = id;
    } catch (err) {
      console.warn("Failed to render Turnstile widget:", err);
      // Fallback in test environment
      if (siteKey === CF_DUMMY_ALWAYS_PASS_KEY) {
        onVerify("cf-turnstile-dummy-pass-token");
      }
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [isScriptReady, siteKey, theme]);

  return (
    <div className={`turnstile-container flex flex-col items-center justify-center my-3.5 w-full ${className}`}>
      <div
        ref={containerRef}
        className="min-h-[65px] min-w-[280px] w-full flex items-center justify-center"
      />
      <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-gray-600 dark:text-gray-300">
        <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z" />
        </svg>
        <span>
          ป้องกันระบบความปลอดภัยด้วย <strong>Cloudflare Turnstile</strong>
        </span>
      </div>
    </div>
  );
}
