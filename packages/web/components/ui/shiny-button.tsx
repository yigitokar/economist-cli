"use client";

import * as React from 'react';
import { motion, type MotionProps } from 'framer-motion';

import { cn } from '@/lib/utils';

const animationProps: MotionProps = {
  initial: { '--x': '100%', scale: 0.8 },
  animate: { '--x': '-100%', scale: 1 },
  whileTap: { scale: 0.95 },
  transition: {
    repeat: Infinity,
    repeatType: 'loop',
    repeatDelay: 1,
    type: 'spring',
    stiffness: 20,
    damping: 15,
    mass: 2,
    scale: {
      type: 'spring',
      stiffness: 200,
      damping: 5,
      mass: 0.5,
    },
  },
};

type MotionButtonProps = React.ComponentPropsWithoutRef<typeof motion.button>;

interface ShinyButtonProps extends MotionButtonProps {
  children: React.ReactNode;
  textClassName?: string;
  glowClassName?: string;
}

export const ShinyButton = React.forwardRef<HTMLButtonElement, ShinyButtonProps>(
  ({ children, className, textClassName, glowClassName, ...props }, ref) => {
    return (
      <motion.button
        {...animationProps}
        ref={ref}
        {...props}
        className={cn(
          'group relative cursor-pointer overflow-hidden rounded-lg px-6 py-2 font-medium backdrop-blur-xl transition-shadow duration-300 ease-in-out hover:cursor-pointer hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/60',
          'bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.2)_0%,transparent_60%)] hover:shadow-[0_0_25px_rgba(255,255,255,0.35)]',
          className,
        )}
      >
        <span
          className="pointer-events-none absolute inset-0 z-0 scale-100 rounded-[inherit] bg-[radial-gradient(circle_at_10%_50%,rgba(251,146,60,0.35),transparent_55%),radial-gradient(circle_at_90%_50%,rgba(249,115,22,0.35),transparent_55%)] opacity-50 transition-transform duration-500 ease-out group-hover:opacity-90 group-hover:scale-110"
        />
        <span
          className={cn(
            'pointer-events-none absolute inset-0 z-10 scale-105 transform rounded-[inherit] opacity-0 blur-lg transition duration-500 ease-out group-hover:opacity-80 group-hover:scale-125 group-hover:blur-[26px]',
            'bg-[radial-gradient(circle,rgba(255,255,255,0.35),transparent_65%)]',
            glowClassName,
          )}
        />
        <span
          className={cn(
            'relative z-30 block w-full text-base font-semibold tracking-wide text-white transition-colors duration-300 group-hover:text-white',
            textClassName,
          )}
          style={{
            maskImage:
              'linear-gradient(-75deg,hsl(var(--primary)) calc(var(--x) + 20%),transparent calc(var(--x) + 30%),hsl(var(--primary)) calc(var(--x) + 100%))',
          }}
        >
          {children}
        </span>
        <span
          style={{
            mask: 'linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box,linear-gradient(rgb(0,0,0), rgb(0,0,0))',
            maskComposite: 'exclude',
          }}
          className="pointer-events-none absolute inset-0 z-40 block rounded-[inherit] bg-[linear-gradient(-75deg,hsl(var(--primary)/10%)_calc(var(--x)+20%),hsl(var(--primary)/50%)_calc(var(--x)+25%),hsl(var(--primary)/10%)_calc(var(--x)+100%))] p-px"
        />
        <span className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] bg-[linear-gradient(135deg,rgba(255,255,255,0.25),rgba(255,255,255,0))] opacity-40 group-hover:opacity-60" />
      </motion.button>
    );
  },
);

ShinyButton.displayName = 'ShinyButton';
