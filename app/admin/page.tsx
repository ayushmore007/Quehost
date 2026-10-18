"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Users,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Maximize2,
  QrCode,
  Download,
  RotateCcw,
  LogOut,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  CheckCircle,
} from "lucide-react";

interface QuestionItem {
  id: string;
  text: string;
  created_at?: string;
}

interface ClusterItem {
  id?: number;
  title: string;
  count: number;
  question_ids: string[];
  questions?: QuestionItem[];
}

interface StatsData {
  totalQuestions: number;
  uniqueDevices: number;
  isOpen: boolean;
  lastRunAt?: string | null;
  eventTitle?: string;
  speakerName?: string;
}

export default function AdminDashboardPage() {
  // State
  const [stats, setStats] = useState<StatsData>({
    totalQuestions: 0,
    uniqueDevices: 0,
    isOpen: true,
  });
  const [clusters, setClusters] = useState<ClusterItem[]>([]);
  const [expandedClusterId, setExpandedClusterId] = useState<string | number | null>(null);

  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const [isGrouping, setIsGrouping] = useState<boolean>(false);
  const [isToggling, setIsToggling] = useState<boolean>(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Reset modal state
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [resetInput, setResetInput] = useState<string>("");
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Fetch Live Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch live stats:", err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Fetch Saved Clusters
  const fetchClusters = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/group", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.clusters)) {
          setClusters(data.clusters);
        }
      }
    } catch (err) {
      console.error("Failed to fetch clusters:", err);
    }
  }, []);

  // Polling every 10 seconds for live totals
  useEffect(() => {
    fetchStats();
    fetchClusters();

    const interval = setInterval(() => {
      fetchStats();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchStats, fetchClusters]);

  // Toggle Submissions Open/Close
  const handleToggleOpen = async () => {
    if (isToggling) return;
    setIsToggling(true);
    const targetState = !stats.isOpen;

    // Optimistic UI update so the toggle flips instantly
    setStats((prev) => ({ ...prev, isOpen: targetState }));

    try {
      const res = await fetch("/api/admin/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ open: targetState }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        // Revert on failure and display error
        setStats((prev) => ({ ...prev, isOpen: !targetState }));
        setWarningMessage(data?.error || "Failed to update submission state.");
        return;
      }

      if (!targetState) {
        // Closed submissions: auto-grouping was triggered!
        if (data?.groupingResult?.clusters) {
          setClusters(data.groupingResult.clusters);
          if (data.groupingResult.isFallback) {
            setWarningMessage(data.groupingResult.message || "Fallback grouping was used.");
          } else {
            setWarningMessage(null);
          }
        } else {
          await fetchClusters();
        }

        setSuccessBanner("Submissions closed & questions auto-clustered with Gemini!");
        setTimeout(() => setSuccessBanner(null), 5000);
      } else {
        setSuccessBanner("Submissions are now open for attendees.");
        setTimeout(() => setSuccessBanner(null), 3000);
      }
    } catch (err) {
      console.error("Error toggling submissions:", err);
      // Revert on network error
      setStats((prev) => ({ ...prev, isOpen: !targetState }));
      setWarningMessage("Network error while connecting to server.");
    } finally {
      setIsToggling(false);
    }
  };

  // Group & Rank Button Trigger
  const handleGroupAndRank = async () => {
    if (isGrouping) return;
    setIsGrouping(true);
    setWarningMessage(null);

    try {
      const res = await fetch("/api/admin/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        setWarningMessage(data.error || "Failed to cluster questions.");
        return;
      }

      if (Array.isArray(data.clusters)) {
        setClusters(data.clusters);
      }

      if (data.isFallback) {
        setWarningMessage(
          data.message ||
            "Gemini API was unavailable after retries. Showing fallback normalized text grouping. Submissions were not lost."
        );
      } else {
        setSuccessBanner(`Grouped into ${data.clusters?.length || 0} clusters using Gemini 2.0 Flash.`);
        setTimeout(() => setSuccessBanner(null), 4000);
      }
    } catch (err) {
      setWarningMessage("Network error during grouping execution.");
    } finally {
      setIsGrouping(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    window.open("/api/admin/export", "_blank");
  };

  // Reset All
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetInput.trim() !== "RESET" || isResetting) return;

    setIsResetting(true);
    try {
      const res = await fetch("/api/admin/reset", { method: "POST" });
      if (res.ok) {
        setShowResetModal(false);
        setResetInput("");
        setClusters([]);
        setWarningMessage(null);
        await fetchStats();
        setSuccessBanner("Event questions and clusters have been reset.");
        setTimeout(() => setSuccessBanner(null), 4000);
      }
    } catch (err) {
      console.error("Reset failed:", err);
    } finally {
      setIsResetting(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      window.location.href = "/admin/login";
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const speakerName = stats.speakerName || "Love Babbar";

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-6 animate-fade-in">
      {/* Top Navbar */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200/90 animate-slide-up">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              Host Console
            </span>
            <span className="text-slate-300">•</span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold ${
                stats.isOpen
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  stats.isOpen ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`}
              />
              {stats.isOpen ? "Submissions Open" : "Submissions Closed"}
            </span>
          </div>

          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {stats.eventTitle || "IEEE Live Q&A Session"}
          </h1>
          <p className="text-xs font-medium text-slate-500">
            Speaker: <span className="text-slate-900 font-bold">{speakerName}</span>
          </p>
        </div>

        {/* Action Links (Responsive scrollable/wrapped row on mobile) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap">
          <Link
            href="/admin/present"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-all border border-slate-200/90 shadow-xs whitespace-nowrap active:scale-95"
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-900" />
            <span>Present</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>

          <Link
            href="/qr"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-all border border-slate-200/90 shadow-xs whitespace-nowrap active:scale-95"
          >
            <QrCode className="w-3.5 h-3.5 text-slate-900" />
            <span>QR Code</span>
          </Link>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-all border border-slate-200/90 shadow-xs whitespace-nowrap active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowResetModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold transition-all border border-rose-200 shadow-xs whitespace-nowrap active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>Reset</span>
          </button>

          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors border border-slate-200 shadow-xs active:scale-95"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-3.5 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-medium flex items-center gap-2 shadow-sm animate-scale-up">
          <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-400" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Warning Banner */}
      {warningMessage && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3 shadow-xs animate-scale-up">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
          <div className="leading-relaxed font-medium">{warningMessage}</div>
        </div>
      )}

      {/* Live Totals Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Total Questions */}
        <div className="clean-card rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex items-center justify-between bg-white">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Questions
            </p>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {stats.totalQuestions}
            </h2>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900 border border-slate-200">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Unique Devices */}
        <div className="clean-card rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex items-center justify-between bg-white">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Unique Attendees
            </p>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {stats.uniqueDevices}
            </h2>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900 border border-slate-200">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Live Status & Quick Toggle */}
        <div className="clean-card rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex items-center justify-between bg-white">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Audience Submissions</span>
            </div>
            <div className="mt-2">
              <button
                id="toggle-submissions-button"
                onClick={handleToggleOpen}
                disabled={isToggling}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                  stats.isOpen
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 shadow-xs"
                    : "bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 shadow-xs"
                }`}
              >
                {isToggling ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-600" />
                ) : stats.isOpen ? (
                  <ToggleRight className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ToggleLeft className="w-4 h-4 text-slate-600" />
                )}
                <span>{stats.isOpen ? "Open (Tap to Close)" : "Closed (Tap to Open)"}</span>
              </button>
            </div>
          </div>
          <button
            onClick={() => {
              fetchStats();
              fetchClusters();
            }}
            title="Refresh now"
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors shadow-xs active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Action Bar */}
      <div className="clean-card rounded-2xl p-4 sm:p-6 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-slate-800" />
            <span>AI Intent Grouping</span>
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Clusters multilingual questions by semantic intent using Gemini 2.0 Flash.
          </p>
        </div>

        <button
          id="group-and-rank-button"
          onClick={handleGroupAndRank}
          disabled={isGrouping || stats.totalQuestions === 0}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-black disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2.5 shadow-sm hover:shadow-md active:scale-95"
        >
          {isGrouping ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              <span>Clustering with Gemini...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-slate-300" />
              <span>Group &amp; Rank ({stats.totalQuestions} questions)</span>
            </>
          )}
        </button>
      </div>

      {/* Ranked Clusters List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Ranked Question Clusters ({clusters.length})
          </h2>
          <span className="text-xs font-medium text-slate-500">
            Sorted by distinct attendees
          </span>
        </div>

        {clusters.length === 0 ? (
          <div className="clean-card rounded-2xl p-10 sm:p-12 text-center space-y-3 border border-slate-200 bg-white shadow-sm">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              No Question Clusters Generated Yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {stats.totalQuestions === 0
                ? "Share the QR code with attendees to start collecting questions."
                : "You have questions waiting. Click 'Group & Rank' to cluster them with Gemini."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {clusters.map((cluster, index) => {
              const clusterKey = cluster.id ?? index;
              const isExpanded = expandedClusterId === clusterKey;

              return (
                <div
                  key={clusterKey}
                  className="clean-card rounded-2xl overflow-hidden border border-slate-200/90 transition-all hover:border-slate-300 shadow-xs hover:shadow-sm bg-white"
                >
                  <div
                    onClick={() =>
                      setExpandedClusterId(isExpanded ? null : clusterKey)
                    }
                    className="p-4 sm:p-5 flex items-start sm:items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                      {/* Rank Badge */}
                      <span
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 mt-0.5 sm:mt-0 ${
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
                      </span>

                      {/* Title (Full wrap on phone, no truncating cutoff) */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug break-words">
                          {cluster.title}
                        </h3>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                          {cluster.question_ids?.length || 0} total questions
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      {/* Distinct Devices Count Badge */}
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-900 border border-slate-300 text-xs font-bold whitespace-nowrap shadow-xs">
                        {cluster.count} {cluster.count === 1 ? "attendee" : "attendees"}
                      </span>

                      <button
                        type="button"
                        aria-label="Expand questions"
                        className="text-slate-400 hover:text-slate-700 p-1"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Accordion for Original Questions */}
                  {isExpanded && (
                    <div className="px-3.5 sm:px-5 pb-4 pt-2 border-t border-slate-100 bg-slate-50/70 space-y-2 animate-fade-in">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 pt-1">
                        Original Submissions in this cluster:
                      </p>
                      {cluster.questions && cluster.questions.length > 0 ? (
                        <div className="space-y-2">
                          {cluster.questions.map((q) => (
                            <div
                              key={q.id}
                              className="p-3 rounded-xl bg-white border border-slate-200/90 text-xs text-slate-800 leading-relaxed shadow-xs"
                            >
                              <p className="text-slate-900 font-medium break-words">{q.text}</p>
                              {q.created_at && (
                                <p className="text-[10px] text-slate-400 mt-1 font-mono">
                                  {new Date(q.created_at).toLocaleTimeString()}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          {cluster.question_ids?.length || 0} questions linked
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Confirmation Modal for Reset */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="max-w-md w-full rounded-2xl p-5 sm:p-6 border border-rose-200 bg-white shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600">
              <RotateCcw className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900">Reset All Event Data?</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              This action will permanently delete all questions and clusters from Supabase and reopen submissions. This cannot be undone.
            </p>
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Type <span className="font-bold text-rose-600">RESET</span> to confirm:
                </label>
                <input
                  type="text"
                  value={resetInput}
                  onChange={(e) => setResetInput(e.target.value)}
                  placeholder="RESET"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-base sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-xs"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetInput.trim() !== "RESET" || isResetting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-xs font-bold text-white transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  {isResetting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Confirm Wipe</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
