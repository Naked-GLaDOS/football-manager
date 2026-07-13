import { useEffect, useRef, useState } from 'react';
import { useNotifications } from '../lib/notifications';
import { useSession } from '../lib/session';
import { useNav } from '../lib/nav';
import type { AppNotification } from '../lib/api';
import { IconBell } from './Icons';

// Relative time ("5m", "2h", "3d") localised to the active language.
function relTime(iso: string, lang: 'it' | 'en'): string {
  const diff = Date.now() - new Date(iso).getTime();
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto', style: 'narrow' });
  const min = Math.round(diff / 60000);
  if (Math.abs(min) < 60) return rtf.format(-min, 'minute');
  const hr = Math.round(min / 60);
  if (Math.abs(hr) < 24) return rtf.format(-hr, 'hour');
  return rtf.format(-Math.round(hr / 24), 'day');
}

export default function NotificationBell() {
  const { t, lang } = useSession();
  const { items, unreadCount, markRead, markAllRead } = useNotifications();
  const nav = useNav();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const onItemClick = (n: AppNotification) => {
    if (!n.readAt) markRead(n.id);
    if (n.matchId) { nav.open({ type: 'match', id: n.matchId }); setOpen(false); }
  };

  return (
    <div className="notif" ref={ref}>
      <button className="btn btn-ghost btn-icon" title={t('notifications')} onClick={() => setOpen((v) => !v)}>
        <IconBell />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-head">
            <strong>{t('notifications')}</strong>
            {unreadCount > 0 && (
              <button className="btn btn-sm btn-ghost" onClick={() => markAllRead()}>{t('markAllRead')}</button>
            )}
          </div>
          <div className="notif-list">
            {items.length === 0 && <p className="empty" style={{ padding: '1.2rem 0' }}>{t('notificationsEmpty')}</p>}
            {items.map((n) => (
              <button
                key={n.id}
                className={`notif-item${n.readAt ? '' : ' unread'}${n.matchId ? ' clickable' : ''}`}
                onClick={() => onItemClick(n)}
              >
                {!n.readAt && <span className="notif-dot" />}
                <span className="notif-body">
                  <span className="notif-title">{n.title}</span>
                  <span className="notif-text">{n.body}</span>
                  <span className="notif-time">{relTime(n.createdAt, lang)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
