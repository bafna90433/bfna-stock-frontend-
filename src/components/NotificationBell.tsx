import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import api from '../api/axios';

interface Notif {
  _id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  urgent?: boolean;
  link?: string;
  read: boolean;
  createdAt: string;
}

const typeColor: Record<string, string> = {
  success: '#10B981',
  warning: '#F59E0B',
  error:   '#EF4444',
  info:    '#6366F1',
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const NotificationBell: React.FC = () => {
  const [notifs, setNotifs]     = useState<Notif[]>([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const unread = notifs.filter(n => !n.read).length;

  const fetchNotifs = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifs(data);
    } catch {}
  };

  useEffect(() => {
    fetchNotifs();
    const iv = setInterval(fetchNotifs, 30000);
    return () => clearInterval(iv);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifs(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
  };

  const markAll = async () => {
    setLoading(true);
    await api.patch('/notifications/read-all/mark');
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    setLoading(false);
  };

  return (
    <div ref={dropRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative',
          background: open ? 'white' : 'rgba(255,255,255,0.7)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '0.45rem 0.6rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.15s',
          width: 38,
          height: 38,
        }}
      >
        <Bell size={17} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#EF4444', color: '#fff',
            fontSize: '0.6rem', fontWeight: 800,
            borderRadius: 20, padding: '1px 5px',
            minWidth: 16, textAlign: 'center',
            animation: 'bell-pulse 1.4s ease-in-out infinite',
            boxShadow: '0 0 8px rgba(239,68,68,0.7)',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          zIndex: 9999,
          width: 320,
          maxHeight: 420,
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg2)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={15} color="var(--primary)" />
              <span style={{ fontWeight: 800, fontSize: '0.88rem' }}>Notifications</span>
              {unread > 0 && (
                <span style={{ background: '#EF4444', color: '#fff', fontSize: '0.62rem', fontWeight: 800, borderRadius: 20, padding: '1px 7px' }}>
                  {unread} new
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              {unread > 0 && (
                <button
                  onClick={markAll}
                  disabled={loading}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 6 }}
                >
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                <X size={15} />
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifs.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                🔔 No notifications yet
              </div>
            ) : (
              notifs.map(n => (
                <div
                  key={n._id}
                  onClick={() => { markRead(n._id); if (n.link) window.location.href = n.link; }}
                  style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: n.read ? 'transparent' : 'rgba(99,102,241,0.05)',
                    display: 'flex',
                    gap: '0.65rem',
                    alignItems: 'flex-start',
                    transition: 'background 0.12s',
                  }}
                >
                  {/* Color dot */}
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                    background: typeColor[n.type] || '#6366F1',
                    boxShadow: n.read ? 'none' : `0 0 6px ${typeColor[n.type]}80`,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: n.read ? 600 : 800, fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.3 }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 4 }}>
                      {timeAgo(n.createdAt)}
                    </div>
                  </div>
                  {!n.read && (
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366F1', flexShrink: 0, marginTop: 6 }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes bell-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};

export default NotificationBell;
