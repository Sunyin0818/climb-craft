'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLogStore, type LogEntry } from '@/store/useLogStore';
import { useSceneStore } from '@/store/useSceneStore';
import { useLocaleStore } from '@/store/useLocaleStore';

interface FeedbackDialogProps {
  onClose: () => void;
}

const MAX_DESCRIPTION_LENGTH = 2000;

export default function FeedbackDialog({ onClose }: FeedbackDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [includeLogs, setIncludeLogs] = useState(true);
  const [includeDeviceInfo, setIncludeDeviceInfo] = useState(true);
  const [includeSnapshot, setIncludeSnapshot] = useState(false);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submittingRef = useRef(false);
  const entries = useLogStore((s) => s.entries);
  const sessionId = useLogStore((s) => s.sessionId);
  const t = useLocaleStore((s) => s.t);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Focus textarea on mount
  useEffect(() => {
    if (mounted) {
      textareaRef.current?.focus();
    }
  }, [mounted]);

  // Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    const trimmed = description.trim();
    if (!trimmed || submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(false);

    const payload: Record<string, unknown> = {
      description: trimmed,
      sessionId,
    };
    if (email.trim()) payload.email = email.trim();
    if (includeLogs) payload.entries = useLogStore.getState().entries;
    if (includeDeviceInfo) payload.userAgent = navigator.userAgent;
    if (includeSnapshot) {
      const { nodes, edges, panels } = useSceneStore.getState();
      payload.sceneSnapshot = { nodes, edges, panels };
    }

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Request failed');
      setSubmitted(true);
      setTimeout(() => onClose(), 1500);
    } catch {
      setSubmitError(true);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [description, email, includeLogs, includeDeviceInfo, includeSnapshot, sessionId, onClose]);

  if (!mounted) return null;

  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-dialog-title"
        className="relative bg-[#1a1c23] border border-white/10 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h2 id="feedback-dialog-title" className="text-xl font-bold text-white tracking-wide">
            {t.feedback.title}
          </h2>
          <button
            onClick={onClose}
            aria-label={t.feedback.cancel}
            className="p-2 -mr-2 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/10"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {submitted ? (
            /* Success state */
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <svg className="w-12 h-12 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-white font-medium text-lg">{t.feedback.successMessage}</p>
            </div>
          ) : (
            <>
              {/* Description */}
              <div>
                <label className="text-sm font-medium text-white/80 mb-2 block">{t.feedback.descriptionLabel}</label>
                <textarea
                  ref={textareaRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
                  placeholder={t.feedback.descriptionPlaceholder}
                  rows={4}
                  aria-required="true"
                  className="w-full min-h-[100px] resize-y bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-sans text-sm"
                />
                <div className="text-right text-xs text-white/30 mt-1">
                  {t.feedback.charCount(description.length, MAX_DESCRIPTION_LENGTH)}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-sm font-medium text-white/80 mb-2 block">{t.feedback.emailLabel}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.feedback.emailPlaceholder}
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all text-sm"
                />
              </div>

              {/* Attachments */}
              <div>
                <div className="text-sm font-medium text-white/80 mb-3">{t.feedback.autoAttachments}</div>
                <div className="space-y-2.5">
                  <label className="flex items-center gap-3 text-sm text-white/60 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={includeLogs}
                      onChange={(e) => setIncludeLogs(e.target.checked)}
                      className="w-4 h-4 accent-cyan-400 rounded"
                    />
                    <span className="group-hover:text-white/80 transition-colors">{t.feedback.includeLogs}</span>
                  </label>
                  <label className="flex items-center gap-3 text-sm text-white/60 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={includeDeviceInfo}
                      onChange={(e) => setIncludeDeviceInfo(e.target.checked)}
                      className="w-4 h-4 accent-cyan-400 rounded"
                    />
                    <span className="group-hover:text-white/80 transition-colors">{t.feedback.includeDeviceInfo}</span>
                  </label>
                  <label className="flex items-center gap-3 text-sm text-white/60 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={includeSnapshot}
                      onChange={(e) => setIncludeSnapshot(e.target.checked)}
                      className="w-4 h-4 accent-cyan-400 rounded"
                    />
                    <span className="group-hover:text-white/80 transition-colors">{t.feedback.includeSnapshot}</span>
                  </label>
                </div>
              </div>

              {/* Log preview */}
              {includeLogs && (
                <div>
                  <button
                    type="button"
                    onClick={() => setLogsExpanded(!logsExpanded)}
                    className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 cursor-pointer transition-colors"
                  >
                    <svg
                      className={`w-3 h-3 transition-transform ${logsExpanded ? 'rotate-90' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    {logsExpanded ? t.feedback.hideLogs : t.feedback.showLogs} ({entries.length})
                  </button>
                  {logsExpanded && (
                    <div className="mt-2 bg-black/30 border border-white/5 rounded-lg max-h-40 overflow-y-auto">
                      {entries.length === 0 ? (
                        <p className="text-xs text-white/30 p-4 text-center">{t.feedback.logEmpty}</p>
                      ) : (
                        <table className="w-full text-xs" role="table" aria-label={t.feedback.logHistory}>
                          <thead>
                            <tr className="text-white/40 border-b border-white/5">
                              <th className="text-left px-3 py-2 font-medium">{t.feedback.colTime}</th>
                              <th className="text-left px-3 py-2 font-medium">{t.feedback.colAction}</th>
                              <th className="text-left px-3 py-2 font-medium">{t.feedback.colResult}</th>
                              <th className="text-left px-3 py-2 font-medium">{t.feedback.colReason}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entries.slice(-50).reverse().map((entry) => (
                              <LogRow key={entry.id} entry={entry} />
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Privacy notice */}
              <p className="text-xs text-white/40">{t.feedback.privacyNotice}</p>

              {/* Error message */}
              {submitError && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="flex-1">{t.feedback.errorMessage}</span>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="text-red-300 underline text-sm hover:text-red-200 cursor-pointer"
                  >
                    {t.feedback.retry}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!submitted && (
          <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end gap-3 shrink-0">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              {t.feedback.cancel}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!description.trim() || submitting}
              className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50 bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-cyan-500/25 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {submitting ? t.feedback.submitting : t.feedback.submit}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

function LogRow({ entry }: { entry: LogEntry }) {
  const time = new Date(entry.timestamp).toLocaleTimeString();
  return (
    <tr className="border-b border-white/5 hover:bg-white/5">
      <td className="px-3 py-1.5 text-white/40 whitespace-nowrap font-mono">{time}</td>
      <td className="px-3 py-1.5 text-white/60 font-mono">{entry.action}</td>
      <td className="px-3 py-1.5">
        <span className={entry.result === 'success' ? 'text-emerald-400' : 'text-red-400'}>
          {entry.result}
        </span>
      </td>
      <td className="px-3 py-1.5 text-white/30 font-mono">{entry.reason ?? '-'}</td>
    </tr>
  );
}
