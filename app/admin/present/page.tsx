"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Maximize, Minimize, RefreshCw, ArrowLeft, Users, Sparkles } from "lucide-react";

interface ClusterItem {
  id?: number;
  title: string;
  count: number;
  question_ids: string[];
}

export default function PresentModePage() {
  const [clusters, setClusters] = useState<ClusterItem[]>([]);
  const [eventTitle, setEventTitle] = useState<string>("IEEE Live Q&A Session");
  const [speakerName, setSpeakerName] = useState<string>("Love Babbar");
  const [loading, setLoading] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchClusters = useCallback(async () => {
    try {
      const [clusterRes, statsRes] = await Promise.all([
        fetch("/api/admin/group", { cache: "no-store" }),
        fetch("/api/admin/stats", { cache: "no-store" }),
      ]);

      if (clusterRes.ok) {
        const data = await clusterRes.json();
        if (Array.isArray(data.clusters)) {
          setClusters(data.clusters.slice(0, 10));
        }
      }

      if (statsRes.ok) {
        const stats = await statsRes.json();
        if (stats.eventTitle) setEventTitle(stats.eventTitle);
        if (stats.speakerName) setSpeakerName(stats.speakerName);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Present mode fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClusters();

    const interval = setInterval(() => {
      fetchClusters();
    }, 15000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (e.key === "r" || e.key === "R") {
        fetchClusters();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [fetchClusters]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col p-4 sm:p-8 md:p-12 animate-fade-in">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between gap-3 pb-6 sm:pb-8 border-b border-slate-200/90 animate-slide-up">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/admin"
            className="p-2.5 sm:p-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors border border-slate-200 shadow-xs"
            title="Return to Admin"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-bold shadow-xs">
                <Sparkles className="w-3 h-3 text-slate-300" />
                <span>Priority Rankings</span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 mt-1">
              {eventTitle}
            </h1>
            <p className="text-xs sm:text-base text-slate-500 font-medium">
              Speaker: <span className="text-slate-900 font-bold">{speakerName}</span>
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={() => fetchClusters()}
            title="Refresh Questions (R)"
            className="p-2.5 sm:p-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors border border-slate-200 shadow-xs"
          >
            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen (F)"
            className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 sm:gap-2 shadow-sm hover:shadow-md"
          >
            {isFullscreen ? (
              <>
                <Minimize className="w-4 h-4" />
                <span className="hidden sm:inline">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize className="w-4 h-4" />
                <span className="hidden sm:inline">Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Questions Stage Area */}
      <main className="flex-1 py-6 sm:py-8 max-w-5xl w-full mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <RefreshCw className="w-10 h-10 text-slate-700 animate-spin" />
            <p className="text-base sm:text-lg font-medium text-slate-500">Loading top questions for stage...</p>
          </div>
        ) : clusters.length === 0 ? (
          <div className="clean-card rounded-3xl p-10 sm:p-16 text-center space-y-4 border border-slate-200 bg-white shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
              No Grouped Questions to Display Yet
            </h2>
            <p className="text-sm sm:text-base text-slate-500 max-w-md mx-auto">
              Once attendees submit questions and the host triggers &quot;Group &amp; Rank&quot;, the top 10 intent clusters will appear here in large format.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5 sm:space-y-5">
            {clusters.map((cluster, index) => (
              <div
                key={cluster.id ?? index}
                className={`clean-card rounded-2xl p-4 sm:p-5 md:p-6 transition-all border flex items-center justify-between gap-3 sm:gap-6 shadow-xs hover:shadow-sm animate-slide-up ${
                  index === 0
                    ? "bg-white border-2 border-slate-900 shadow-md"
                    : index === 1
                    ? "bg-white border border-slate-300"
                    : "bg-white border border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-6 flex-1 min-w-0">
                  {/* Rank Number */}
                  <div
                    className={`w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-sm sm:text-2xl flex-shrink-0 shadow-xs ${
                      index === 0
                        ? "bg-slate-900 text-white"
                        : index === 1
                        ? "bg-slate-800 text-white"
                        : index === 2
                        ? "bg-slate-700 text-white"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    #{index + 1}
                  </div>

                  {/* High Contrast Question Title */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm sm:text-xl md:text-2xl font-extrabold text-slate-900 leading-snug break-words">
                      {cluster.title}
                    </h2>
                  </div>
                </div>

                {/* Attendee Count Badge */}
                <div className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2.5 px-3 py-2 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-100 border border-slate-300 shadow-xs">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
                  <div className="text-right">
                    <div className="text-base sm:text-2xl font-black text-slate-900">
                      {cluster.count}
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden sm:block">
                      {cluster.count === 1 ? "person" : "people"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-slate-400 pt-6 font-medium">
        Quehost Stage Mode • Tap Fullscreen for Auditorium Display
      </footer>
    </div>
  );
}
