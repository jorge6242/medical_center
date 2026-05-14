'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  BarChart3,
  ClipboardList,
  CreditCard,
  Receipt,
  Stethoscope,
  Users,
} from 'lucide-react';

import { useSidebarNav } from '@/shared/hooks/use-sidebar-nav';
import { cn } from '@/shared/utils/cn';

const ICON_MAP = {
  Users,
  CreditCard,
  Receipt,
  Stethoscope,
  BarChart3,
  ClipboardList,
} as const;

type IconName = keyof typeof ICON_MAP;

export function Sidebar() {
  const pathname = usePathname();
  const navItems = useSidebarNav();

  return (
    <aside className="flex h-full w-60 flex-col bg-surface shadow-elevation-2">
      <div className="border-b border-outline-variant px-6 py-4">
        <span className="text-lg font-bold text-primary">Centro Médico</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = ICON_MAP[item.icon as IconName];
            const isActive = pathname.startsWith(item.path);
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-container text-on-primary-container'
                      : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface',
                  )}
                >
                  {Icon && <Icon className="h-5 w-5 shrink-0" />}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
