import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Printer,
  Trash2,
  ChevronUp,
  ChevronDown,
  ArrowUp,
  Brain,
  X,
} from 'lucide-react';

/**
 * GBS Enterprise System Feedback Brain
 * Authoritative central command-response monitor across every dashboard & role.
 */
export function emitBrainEvent(payload) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('gbs-brain-event', {
      detail: {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toLocaleTimeString(),
        type: payload?.type || 'info',
        title: payload?.title || 'System Action',
        message: payload?.message || 'Action processed by GBS Core Engine.',
        endpoint: payload?.endpoint || '',
        method: payload?.method || '',
        status: payload?.status ?? null,
        module: payload?.module || 'SYSTEM',
        role: payload?.role || 'ACTIVE_USER',
      },
    })
  );
}

if (typeof window !== 'undefined') {
  window.gbsBrainNotify = emitBrainEvent;
}

export default function SystemFeedbackBrain({ currentRole, activeModule }) {
  const [events, setEvents] = useState([
    {
      id: 'boot-brain',
      timestamp: new Date().toLocaleTimeString(),
      type: 'success',
      title: 'GBS System Feedback Brain Active',
      message: 'All clicks, commands, API writes, dispatches, prints, and module links are monitored live.',
      endpoint: '/api/v1/health',
      method: 'SYSTEM',
      status: 200,
      module: activeModule || 'OVERVIEW',
      role: currentRole || 'GUEST',
    },
  ]);
  const [toasts, setToasts] = useState([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const handler = (ev) => {
      const detail = ev?.detail;
      if (!detail) return;
      const enriched = {
        ...detail,
        module: detail.module && detail.module !== 'SYSTEM' ? detail.module : activeModule || 'OVERVIEW',
        role: detail.role && detail.role !== 'ACTIVE_USER' ? detail.role : currentRole || 'GUEST',
      };
      setEvents((prev) => [enriched, ...prev].slice(0, 35));

      const shouldToast =
        enriched.type === 'error' ||
        enriched.type === 'warning' ||
        (enriched.method && enriched.method !== 'GET') ||
        enriched.forceToast;

      if (shouldToast) {
        setToasts((prev) => [enriched, ...prev].slice(0, 3));
        setTimeout(() => {
          setToasts((prev) => prev.filter((item) => item.id !== enriched.id));
        }, 5200);
      }
    };

    window.addEventListener('gbs-brain-event', handler);
    return () => window.removeEventListener('gbs-brain-event', handler);
  }, [activeModule, currentRole]);

  const latest = events[0];

  const getColors = (type) => {
    if (type === 'success') return { border: 'rgba(16,185,129,0.65)', bg: 'rgba(6,78,59,0.92)', text: '#6ee7b7', Icon: CheckCircle2 };
    if (type === 'warning') return { border: 'rgba(245,158,11,0.72)', bg: 'rgba(120,53,15,0.92)', text: '#fcd34d', Icon: AlertTriangle };
    if (type === 'error') return { border: 'rgba(239,68,68,0.75)', bg: 'rgba(127,29,29,0.94)', text: '#fca5a5', Icon: XCircle };
    return { border: 'rgba(229,195,88,0.65)', bg: 'rgba(24,20,14,0.92)', text: '#fde68a', Icon: Activity };
  };

  const handleCopyText = async (txt, label) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(txt);
      }
      emitBrainEvent({
        type: 'success',
        method: 'CLIPBOARD',
        title: `Copied ${label}`,
        message: `Copied to clipboard: ${String(txt).slice(0, 90)}`,
        module: activeModule,
        role: currentRole,
        forceToast: true,
      });
    } catch (err) {
      emitBrainEvent({
        type: 'warning',
        method: 'CLIPBOARD',
        title: 'Clipboard Copy Notice',
        message: err?.message || 'Clipboard permission denied in this browser frame.',
        module: activeModule,
        role: currentRole,
        forceToast: true,
      });
    }
  };

  return (
    <>
      {/* Live Toast Feedback Stack */}
      <div
        className="no-print"
        style={{
          position: 'fixed',
          top: '76px',
          right: '16px',
          zIndex: 9998,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxWidth: '390px',
          width: 'calc(100vw - 32px)',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => {
          const { border, bg, text, Icon } = getColors(toast.type);
          return (
            <div
              key={toast.id}
              style={{
                pointerEvents: 'auto',
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: '10px',
                padding: '10px 12px',
                boxShadow: '0 10px 26px rgba(0,0,0,0.75)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <Icon size={18} style={{ color: text, flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fff', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <span>{toast.title}</span>
                  <span style={{ fontSize: '0.68rem', color: text }}>{toast.status ? `HTTP ${toast.status}` : toast.method || 'OK'}</span>
                </div>
                <div style={{ fontSize: '0.76rem', color: '#f5f5f4', marginTop: '2px', wordBreak: 'break-word' }}>
                  {toast.message}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#d6d3d1', marginTop: '4px' }}>
                  Role: {toast.role} • Module: {toast.module} • {toast.timestamp}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
                style={{ background: 'none', border: 'none', color: '#e7e5e4', cursor: 'pointer', padding: '2px' }}
                title="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Persistent Collapsible System Brain Command & Feedback Bar */}
      <div
        className="gbs-brain-bar no-print"
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '14px',
          left: '14px',
          maxWidth: '1560px',
          margin: '0 auto',
          zIndex: 9990,
        }}
      >
        {expanded && (
          <div
            className="glass-panel header-3d-panel"
            style={{
              marginBottom: '8px',
              padding: '12px 14px',
              maxHeight: '290px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid rgba(243,217,126,0.35)', paddingBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Brain size={17} style={{ color: '#fde68a' }} />
                <span className="header-3d-gold" style={{ fontSize: '0.92rem' }}>
                  GBS CENTRAL FEEDBACK BRAIN • LIVE RESPONSE LEDGER ({events.length})
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleCopyText(window.location.href, 'System URL')}
                  className="btn-outline-gold"
                  style={{ fontSize: '0.72rem', padding: '4px 9px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Copy size={12} /> Copy URL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    emitBrainEvent({ type: 'info', method: 'SCROLL', title: 'Scrolled to Top', message: `Returned to top of ${activeModule} dashboard.`, forceToast: false });
                  }}
                  className="btn-outline-gold"
                  style={{ fontSize: '0.72rem', padding: '4px 9px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <ArrowUp size={12} /> Top
                </button>
                <button
                  type="button"
                  onClick={() => {
                    emitBrainEvent({ type: 'info', method: 'PRINT', title: 'Print Dialog Triggered', message: `Preparing ${activeModule} view in Times New Roman print format.`, forceToast: true });
                    window.print();
                  }}
                  className="btn-outline-gold"
                  style={{ fontSize: '0.72rem', padding: '4px 9px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Printer size={12} /> Print View
                </button>
                <button
                  type="button"
                  onClick={() => setEvents([])}
                  className="btn-outline-gold"
                  style={{ fontSize: '0.72rem', padding: '4px 9px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Trash2 size={12} /> Clear Log
                </button>
              </div>
            </div>

            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px', paddingRight: '4px' }}>
              {events.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '12px', textAlign: 'center' }}>
                  No command events in current buffer. Perform any action on any dashboard to inspect live responses.
                </div>
              ) : (
                events.map((ev) => {
                  const { text } = getColors(ev.type);
                  return (
                    <div
                      key={ev.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'rgba(10,8,6,0.72)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        fontSize: '0.76rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
                        <span style={{ color: text, fontWeight: 800 }}>[{ev.method || ev.type.toUpperCase()}]</span>
                        <span style={{ color: '#fff', fontWeight: 700 }}>{ev.title}:</span>
                        <span style={{ color: '#e7e2d8' }}>{ev.message}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-gold)', fontSize: '0.7rem' }}>
                        <span>{ev.role}</span>
                        <span>•</span>
                        <span>{ev.module}</span>
                        <span>•</span>
                        <span>{ev.timestamp}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(`${ev.title} - ${ev.message}`, 'Response Entry')}
                          style={{ background: 'none', border: 'none', color: '#fde68a', cursor: 'pointer' }}
                          title="Copy response text"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Compact Status Strip */}
        <div
          onClick={() => setExpanded((v) => !v)}
          style={{
            cursor: 'pointer',
            background: 'linear-gradient(90deg, rgba(24,19,12,0.92) 0%, rgba(42,33,18,0.94) 50%, rgba(20,16,10,0.92) 100%)',
            border: '1px solid rgba(229,195,88,0.58)',
            borderRadius: '8px',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 6px 20px rgba(0,0,0,0.72)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
            <Brain size={15} style={{ color: '#fde68a', flexShrink: 0 }} />
            <span style={{ color: '#fde68a', fontWeight: 800, fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
              SYSTEM BRAIN:
            </span>
            <span style={{ color: '#fff', fontSize: '0.76rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {latest ? `${latest.title} — ${latest.message}` : 'Ready for command across all 17 roles.'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, fontSize: '0.72rem', color: '#e7e2d8' }}>
            <span>Role: <strong style={{ color: '#fde68a' }}>{currentRole || 'GUEST'}</strong></span>
            <span>View: <strong style={{ color: '#fde68a' }}>{activeModule || 'OVERVIEW'}</strong></span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#fde68a', fontWeight: 700 }}>
              {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              {expanded ? 'Hide Brain' : 'Open Brain'}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

