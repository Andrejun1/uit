'use client';

import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color: 'blue' | 'amber' | 'emerald' | 'purple';
}

const colorMap = {
  blue: {
    bg: 'bg-[#DBEAFE]',
    icon: 'text-[#1D4ED8]',
    value: 'text-[#1D4ED8]',
    bar: 'bg-[#2563EB]',
  },
  amber: {
    bg: 'bg-[#E0F2FE]',
    icon: 'text-[#0369A1]',
    value: 'text-[#0369A1]',
    bar: 'bg-[#F59E0B]',
  },
  emerald: {
    bg: 'bg-[#DCFCE7]',
    icon: 'text-[#15803D]',
    value: 'text-[#15803D]',
    bar: 'bg-[#22C55E]',
  },
  purple: {
    bg: 'bg-[#F3E8FF]',
    icon: 'text-[#7E22CE]',
    value: 'text-[#7E22CE]',
    bar: 'bg-[#8B5CF6]',
  },
};

export default function StatsCard({ label, value, icon: Icon, color }: StatsCardProps) {
  const c = colorMap[color];
  return (
    <div className="relative overflow-hidden bg-white border-2 border-ink rounded-2xl p-4 shadow-brut-sm transition-transform hover:-translate-y-1 hover:shadow-brut">
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${c.bar}`} />
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl border-2 border-ink flex items-center justify-center ${c.bg}`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
        <span className="text-[10px] font-bold text-ink/30 uppercase tracking-wider">
          Total
        </span>
      </div>
      <p className={`text-3xl font-black font-display ${c.value} mb-1`}>{value}</p>
      <p className="text-ink/50 text-xs font-semibold">{label}</p>
    </div>
  );
}