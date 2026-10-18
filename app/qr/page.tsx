"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { ArrowLeft, Download, ExternalLink, QrCode as QrIcon, Copy, Check, Info, Edit2 } from "lucide-react";

export default function QRDisplayPage() {
  const [targetUrl, setTargetUrl] = useState<string>("http://localhost:3000");
  const [customUrl, setCustomUrl] = useState<string>("");
  const [isEditingUrl, setIsEditingUrl] = useState<boolean>(false);
  const [dataUrl, setDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [eventTitle, setEventTitle] = useState<string>("IEEE Live Q&A Session");
  const [speakerName, setSpeakerName] = useState<string>("Love Babbar");

  const generateQR = useCallback((urlToEncode: string) => {
    if (!urlToEncode) return;
    QRCode.toDataURL(urlToEncode, {
      width: 1024,
      margin: 2,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((uri) => setDataUrl(uri))
      .catch((err) => console.error("QR Code generation error:", err));
  }, []);

  useEffect(() => {
    let url = "";
    if (typeof window !== "undefined") {
      url = window.location.origin;
    }

    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.eventTitle) setEventTitle(data.eventTitle);
        if (data.speakerName) setSpeakerName(data.speakerName);
      })
      .catch(() => {});

    setTargetUrl(url);
    setCustomUrl(url);
    generateQR(url);
  }, [generateQR]);

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    setTargetUrl(customUrl.trim());
    generateQR(customUrl.trim());
    setIsEditingUrl(false);
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `quehost_qr_code_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyUrl = () => {
    if (!targetUrl) return;
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLocalhost = targetUrl.includes("localhost") || targetUrl.includes("127.0.0.1");

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-10 max-w-2xl mx-auto w-full space-y-5 sm:space-y-6 animate-fade-in">
      {/* Top Navigation */}
      <div className="w-full flex items-center justify-between animate-slide-up">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Host Dashboard</span>
        </Link>
        <span className="text-xs font-bold text-slate-900 font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
          /qr
        </span>
      </div>

      {/* Localhost Explanation Notice */}
      {isLocalhost && (
        <div className="w-full clean-card p-4 rounded-2xl border border-amber-200 bg-amber-50/70 text-amber-900 text-xs sm:text-sm flex items-start gap-3 shadow-xs animate-scale-up">
          <Info className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Testing on mobile?</strong> This QR code links to <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">{targetUrl}</code>. Physical phones cannot open <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">localhost</code> because it looks inside the phone itself.
            <div className="mt-1.5 text-xs text-amber-800">
              Once you deploy on <strong>Render</strong>, the QR code will automatically link to your live public domain (e.g. <code className="font-mono text-amber-950 font-semibold">https://your-app.onrender.com</code>), which opens instantly on any phone!
            </div>
          </div>
        </div>
      )}

      {/* Main QR Card */}
      <div className="clean-card rounded-3xl p-5 sm:p-10 text-center space-y-6 w-full border border-slate-200/90 shadow-lg shadow-slate-900/5 bg-white animate-scale-up">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-900 text-white text-xs font-bold shadow-xs">
            <QrIcon className="w-3.5 h-3.5 text-slate-300" />
            <span>Scan to Ask Questions</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {eventTitle}
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Guest Speaker: <strong className="text-slate-900">{speakerName}</strong>
          </p>
        </div>

        {/* QR Code Container */}
        <div className="mx-auto w-full max-w-[260px] sm:max-w-[320px] aspect-square bg-white p-4 rounded-2xl shadow-md flex items-center justify-center border border-slate-200">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt="Scan QR code to submit questions"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-slate-400 text-xs animate-pulse font-medium">
              Generating High-Res QR...
            </div>
          )}
        </div>

        {/* Target URL with Copy & Change Option */}
        <div className="space-y-2 max-w-md mx-auto">
          {isEditingUrl ? (
            <form onSubmit={handleApplyCustomUrl} className="flex items-center gap-2">
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://your-app.onrender.com"
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-xs"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={() => setIsEditingUrl(false)}
                className="px-2.5 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200"
              >
                Cancel
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 shadow-xs">
              <span className="truncate font-mono pl-2 font-medium">{targetUrl}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditingUrl(true)}
                  title="Change URL for slide export"
                  className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-xs text-[11px] font-bold flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Change</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 transition-colors border border-slate-200 shadow-xs flex items-center gap-1 text-[11px] font-bold"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            id="download-qr-button"
            onClick={handleDownload}
            disabled={!dataUrl}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Download High-Res PNG (1024x1024)</span>
          </button>

          <Link
            href="/"
            target="_blank"
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs sm:text-sm transition-colors border border-slate-200 shadow-xs flex items-center justify-center gap-1.5"
          >
            <span>Open Attendee Page</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}
