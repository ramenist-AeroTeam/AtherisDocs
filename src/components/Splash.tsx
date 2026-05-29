import { useEffect, useState } from "react";
import { playStartupChime } from "@/lib/startupSound";

export function Splash({ ready, soundEnabled }: { ready: boolean; soundEnabled: boolean }) {
  const [show, setShow] = useState(true);
  const [played, setPlayed] = useState(false);
  const [progress, setProgress] = useState(0);
  const mountedAt = useState(() => Date.now())[0];

  useEffect(() => {
    if (played) return;
    if (soundEnabled) playStartupChime();
    setPlayed(true);
  }, [played, soundEnabled]);

  // Progress bar animation
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 30;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Complete progress and fade out
  useEffect(() => {
    if (!ready) return;
    setProgress(100);
    const elapsed = Date.now() - mountedAt;
    const wait = Math.max(0, 700 - elapsed);
    const t = setTimeout(() => setShow(false), wait);
    return () => clearTimeout(t);
  }, [ready, mountedAt]);

  if (!show) return null;

  return (
    <div 
      className="fixed inset-0 z-[200] overflow-hidden splash-fade"
      style={{
        background: "linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0d1229 100%)",
      }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-30">
        <div 
          className="absolute top-0 -right-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
            animation: "float 8s ease-in-out infinite",
          }}
        />
        <div 
          className="absolute bottom-0 -left-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle, #a855f7 0%, transparent 70%)",
            animation: "float 10s ease-in-out infinite 1s",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center gap-12 px-4">
        
        {/* Logo with glow effect */}
        <div className="space-y-4 text-center">
          <div 
            className="font-black text-7xl md:text-8xl tracking-tighter"
            style={{
              background: "linear-gradient(120deg, #6366f1, #ec4899, #6366f1)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "shimmer 3s linear infinite",
              textShadow: "0 0 30px rgba(99, 102, 241, 0.4)",
              filter: "drop-shadow(0 0 20px rgba(99, 102, 241, 0.3))",
            }}
          >
            ATHERIS
          </div>
          
          {/* Subtitle with stagger */}
          <div 
            className="text-sm tracking-[0.3em] uppercase font-bold text-indigo-400"
            style={{
              animation: "fadeInUp 0.8s ease-out 0.2s both",
            }}
          >
            Get Ready
          </div>
        </div>

        {/* Loading bar section */}
        <div className="w-full max-w-sm space-y-4">
          {/* Bar container */}
          <div className="relative h-3 bg-gray-900 rounded-full overflow-hidden border border-indigo-500/30 shadow-lg shadow-indigo-500/20">
            {/* Progress fill */}
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${progress}%`,
                boxShadow: "0 0 10px rgba(99, 102, 241, 0.8)",
              }}
            />
          </div>

          {/* Loading text */}
          <div className="flex items-center justify-between text-xs text-gray-400 uppercase tracking-widest font-semibold">
            <span>Loading</span>
            <span className="font-mono">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Animated dots indicator */}
        <div className="flex gap-3 mt-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-indigo-400"
              style={{
                animation: "pulse 1.4s ease-in-out infinite",
                animationDelay: `${i * 0.2}s`,
                boxShadow: "0 0 8px rgba(99, 102, 241, 0.6)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Global animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-40px) translateX(-10px); }
          75% { transform: translateY(-20px) translateX(10px); }
        }

        @keyframes shimmer {
          0% { background-position: 0% center; }
          50% { background-position: 100% center; }
          100% { background-position: 200% center; }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(0.8);
          }
        }

        .splash-fade {
          animation: fadeOut 0.5s ease-out forwards;
        }

        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
