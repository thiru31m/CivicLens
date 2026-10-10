import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, ExternalLink, Clock } from 'lucide-react';
import { Notification } from '../types';
import { api } from '../services/api';

interface NotificationsPopoverProps {
  onNavigate?: (url: string) => void;
}

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifs = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    } catch {
      // Ignore if unauthenticated
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClickItem = async (notif: Notification) => {
    if (!notif.is_read) {
      try {
        await api.markNotificationRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error(err);
      }
    }
    setIsOpen(false);
    if (notif.link_url && onNavigate) {
      onNavigate(notif.link_url);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-600 rounded-full border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-fade-in">
            <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-800">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-civic-100 text-civic-800 rounded-full font-medium">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-1 text-xs text-civic-600 hover:text-civic-800 font-medium transition"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No notifications yet.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleClickItem(n)}
                    className={`p-3 text-left hover:bg-slate-50 cursor-pointer transition flex items-start gap-3 ${
                      !n.is_read ? 'bg-civic-50/40' : ''
                    }`}
                  >
                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!n.is_read ? 'bg-civic-600' : 'bg-transparent'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs ${!n.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(n.created_at).toLocaleDateString()}</span>
                        {n.link_url && (
                          <span className="inline-flex items-center gap-0.5 text-civic-600 ml-auto">
                            <span>View</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
