import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  trend?: { value: number; label: string };
  delay?: number;
}

const variantStyles = {
  default: 'border-border',
  success: 'border-success/30 bg-success/5',
  warning: 'border-warning/30 bg-warning/5',
  danger: 'border-destructive/30 bg-destructive/5',
  info: 'border-info/30 bg-info/5',
};

const iconStyles = {
  default: 'text-muted-foreground bg-muted',
  success: 'text-success bg-success/10',
  warning: 'text-warning bg-warning/10',
  danger: 'text-destructive bg-destructive/10',
  info: 'text-info bg-info/10',
};

export function MetricCard({ title, value, subtitle, icon: Icon, variant = 'default', trend, delay = 0 }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn('card-base p-5 flex items-start gap-4', variantStyles[variant])}
    >
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', iconStyles[variant])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-barlow font-bold mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {trend && (
          <div className={cn('text-xs font-medium mt-1', trend.value >= 0 ? 'text-success' : 'text-destructive')}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </div>
        )}
      </div>
    </motion.div>
  );
}
