"use client";

import { useEffect, useState, useRef } from "react";
import { Send, CheckCircle2, Lock, AlertCircle, RefreshCw, MessageSquare } from "lucide-react";

export default function AttendeePage() {
  const [deviceId, setDeviceId] = useState<string>("");
  const [eventTitle, setEventTitle] = useState<string>("IEEE Live Q&A Session");
  const [speakerName, setSpeakerName] = useState<string>("Love Babbar");
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [submittedCount, setSubmittedCount] = useState<number>(0);
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize or retrieve persistent Device ID
  useEffect(() => {
    let id = "";

    try {
      id = localStorage.getItem("quehost_device_id") || "";
    } catch {}

    if (!id) {
      const match = document.cookie.match(/(?:^|; )quehost_device_id=([^;]*)/);
      if (match && match[1]) {
        id = decodeURIComponent(match[1]);
      }
    }

    if (!id) {
      id =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : "dev-" + Math.random().toString(36).substring(2, 15) + "-" + Date.now();
    }

    try {
      localStorage.setItem("quehost_device_id", id);
    } catch {}
    document.cookie = `quehost_device_id=${encodeURIComponent(
      id
    )}; path=/; max-age=31536000; SameSite=Lax`;

    setDeviceId(id);

    fetchStatus(id);
  }, []);

  const fetchStatus = async (currentDeviceId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/status?device_id=${encodeURIComponent(currentDeviceId)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setIsOpen(data.open ?? true);
        setSubmittedCount(data.count ?? 0);
        if (data.eventTitle) setEventTitle(data.eventTitle);
        if (data.speakerName) setSpeakerName(data.speakerName);
      }
    } catch (err) {
      console.error("Failed to load event status:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting) return;

    const trimmed = text.trim();
    if (!trimmed) return;
    if (trimmed.length > 300) {
      setErrorMessage("Please limit your question to 300 characters.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: deviceId,
          text: trimmed,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Unable to submit question. Please tap retry.");
        return;
      }

      // Success: Clear input and update count
      setText("");
      setSubmittedCount(data.count ?? submittedCount + 1);
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3000);
    } catch (err) {
      setErrorMessage("Network issue. Your question was saved — tap retry to submit.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const remainingChars = 300 - text.length;
  const isAllDone = submittedCount >= 5;
  const targetSpeaker = speakerName || "Love Babbar";

  return (
    <div className="flex-1 flex flex-col justify-between max-w-lg w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-in">
      {/* Top Header - Strictly Event Title & Clean Live Indicator (Speaker badge removed as requested) */}
      <header className="animate-slide-up text-center space-y-2.5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-[11px] font-bold tracking-wide shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live Audience Q&amp;A</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 px-2">
          {eventTitle}
        </h1>
      </header>

      {/* Main Content Area */}
      <div className="my-auto py-5">
        {loading ? (
          <div className="clean-card rounded-3xl p-10 flex flex-col items-center justify-center space-y-3.5 animate-fade-in">
            <RefreshCw className="w-8 h-8 text-slate-900 animate-spin" />
            <p className="text-sm font-semibold text-slate-600">Connecting to live session...</p>
          </div>
        ) : !isOpen ? (
          // Submissions Closed State
          <div className="clean-card rounded-3xl p-8 sm:p-10 text-center space-y-4 border border-slate-200/90 shadow-lg shadow-slate-900/5 animate-scale-up">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-900 border border-slate-200">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">Submissions are closed.</h2>
            <p className="text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
              The question collection window has concluded. The speaker is now addressing the top audience questions.
            </p>
          </div>
        ) : isAllDone ? (
          // All 5 Questions Completed State
          <div className="clean-card rounded-3xl p-8 sm:p-10 text-center space-y-4 border border-slate-200/90 shadow-lg shadow-slate-900/5 animate-scale-up">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-md">
              <CheckCircle2 className="w-9 h-9 text-emerald-400" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Thanks, all done!</h2>
            <p className="text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
              You’ve submitted all 5 questions. Your questions have been recorded and prioritized for the live Q&amp;A session.
            </p>
          </div>
        ) : (
          // Redesigned Question Box Console
          <div className="clean-card rounded-3xl p-5 sm:p-7 space-y-5 border border-slate-200/90 shadow-xl shadow-slate-900/5 bg-white animate-slide-up">
            {/* Header: Progress Badge & Stepper Track */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black">
                  {submittedCount + 1}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Question {submittedCount + 1} of 5
                </span>
              </div>

              {/* Progress Steps */}
              <div className="flex items-center gap-1.5" aria-label="Progress">
                {[1, 2, 3, 4, 5].map((step) => (
                  <span
                    key={step}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      step <= submittedCount
                        ? "w-4 bg-slate-900"
                        : step === submittedCount + 1
                        ? "w-6 bg-slate-500"
                        : "w-2 bg-slate-200"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Error / Retry Banner */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-scale-up">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                <div className="flex-1 leading-snug font-medium">{errorMessage}</div>
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={submitting}
                  className="font-bold underline hover:text-rose-950 transition-colors ml-1"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Success Feedback */}
            {successToast && (
              <div className="p-3.5 rounded-2xl bg-slate-900 text-white text-xs flex items-center gap-2 shadow-sm animate-scale-up font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Question submitted successfully!</span>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-2xl border border-slate-300 bg-slate-50/60 focus-within:bg-white focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10 transition-all p-3.5 sm:p-4 shadow-inner">
                <textarea
                  id="question-input"
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`What would you like to ask ${targetSpeaker}?`}
                  rows={4}
                  maxLength={300}
                  disabled={submitting}
                  className="w-full bg-transparent border-0 text-base sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed"
                />

                {/* Bottom info strip inside textarea */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/60 mt-1">
                  <span
                    className={`text-[11px] font-mono font-semibold transition-colors ${
                      remainingChars < 20 ? "text-rose-600 font-bold" : "text-slate-400"
                    }`}
                  >
                    {remainingChars} / 300
                  </span>

                  <span className="text-[11px] text-slate-400 hidden sm:inline font-medium">
                    Press Enter to send
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="submit-question-button"
                type="submit"
                disabled={submitting || text.trim().length === 0}
                className="w-full h-13 py-3.5 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-black disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-[0.99]"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Question</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 pt-4 font-medium">
        <span>Quehost • Live Interactive Q&amp;A</span>
      </footer>
    </div>
  );
}
