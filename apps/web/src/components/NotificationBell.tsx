import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

type Notif = {
  _id: string;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt?: string;
  type?: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const data = await api<{ notifications: Notif[]; unreadCount: number }>(
        "/api/notifications?limit=12"
      );
      setItems(data.notifications);
      setUnread(data.unreadCount);
    } catch {
      /* ignore polling errors */
    }
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function markAll() {
    await api("/api/notifications/read-all", { method: "POST" });
    await load();
  }

  async function openItem(n: Notif) {
    if (!n.read) {
      await api(`/api/notifications/${n._id}/read`, { method: "PATCH" });
      await load();
    }
    setOpen(false);
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg border border-teal-900/12 bg-white/70 px-2.5 py-1.5 text-sm font-semibold text-teal-950/80 hover:bg-white"
        aria-label="Notifications"
      >
        Alerts
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-teal-800 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[320px] overflow-hidden rounded-xl border border-teal-900/10 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-teal-900/8 px-3 py-2">
            <p className="text-sm font-semibold text-teal-950">Notifications</p>
            <button
              type="button"
              onClick={() => void markAll()}
              className="text-xs font-semibold text-teal-800 hover:underline"
            >
              Mark all read
            </button>
          </div>
          <ul className="max-h-80 overflow-auto">
            {items.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-teal-950/50">No alerts yet</li>
            ) : (
              items.map((n) => (
                <li key={n._id} className={!n.read ? "bg-teal-50/60" : ""}>
                  {n.href ? (
                    <Link
                      to={n.href}
                      onClick={() => void openItem(n)}
                      className="block px-3 py-2.5 hover:bg-teal-950/[0.03]"
                    >
                      <p className="text-sm font-semibold text-teal-950">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-teal-950/55">{n.body}</p>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void openItem(n)}
                      className="block w-full px-3 py-2.5 text-left hover:bg-teal-950/[0.03]"
                    >
                      <p className="text-sm font-semibold text-teal-950">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-teal-950/55">{n.body}</p>
                    </button>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
