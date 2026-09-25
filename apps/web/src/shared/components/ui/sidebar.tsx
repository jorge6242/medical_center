'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  BarChart3,
  BookOpen,
  Boxes,
  ClipboardList,
  CreditCard,
  FlaskConical,
  House,
  Receipt,
  Stethoscope,
  User,
  Users,
} from 'lucide-react';

import { useSidebarNav } from '@/shared/hooks/use-sidebar-nav';
import { useAppConfig } from '@/features/config/hooks/use-app-config';
import { cn } from '@/shared/utils/cn';
import { resolveLogoUrl } from '@/shared/utils/logo-url';

const ICON_MAP = {
  Users,
  User,
  CreditCard,
  Receipt,
  Stethoscope,
  BarChart3,
  ClipboardList,
  House,
  BookOpen,
  Boxes,
  FlaskConical,
} as const;

type IconName = keyof typeof ICON_MAP;

export function Sidebar() {
  const pathname = usePathname();
  const navItems = useSidebarNav();
  const { data: config } = useAppConfig();
  const tenant = config?.tenant;
  const logoUrl = tenant?.logoUrl ? resolveLogoUrl(tenant.logoUrl) : null;

  return (
    <aside className="flex h-full w-60 flex-col bg-surface shadow-elevation-2">
      <div className="border-b border-outline-variant px-6 py-4">
        {logoUrl ? (
          <div className="relative h-14 w-full">
            <Image
              src={logoUrl}
              alt={`Logo de ${tenant?.name ?? 'Centro Médico'}`}
              fill
              className="object-contain object-left"
              sizes="240px"
            />
          </div>
        ) : (
          <span className="text-lg font-bold text-primary">
            {config?.tenant.name ?? 'Centro Médico'}
          </span>
        )}
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
