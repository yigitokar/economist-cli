'use client';

import React, { useEffect, useLayoutEffect, useRef, useState, cloneElement } from 'react';

const DefaultHomeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);

const DefaultCompassIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
  </svg>
);

const DefaultBellIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

export type NavItem = {
  id: string | number;
  icon: React.ReactElement;
  label?: string;
  onClick?: () => void;
};

const defaultNavItems: NavItem[] = [
  { id: 'default-home', icon: <DefaultHomeIcon />, label: 'Home' },
  { id: 'default-explore', icon: <DefaultCompassIcon />, label: 'Explore' },
  { id: 'default-notifications', icon: <DefaultBellIcon />, label: 'Notifications' },
];

export type LimelightNavProps = {
  items?: NavItem[];
  defaultActiveIndex?: number;
  onTabChange?: (index: number) => void;
  className?: string;
  limelightClassName?: string;
  iconContainerClassName?: string;
  iconClassName?: string;
};

/**
 * Adaptive-width navigation bar with a limelight effect that highlights the active item.
 */
export const LimelightNav = ({
  items = defaultNavItems,
  defaultActiveIndex = 0,
  onTabChange,
  className,
  limelightClassName,
  iconContainerClassName,
  iconClassName,
}: LimelightNavProps) => {
  const [activeIndex, setActiveIndex] = useState(defaultActiveIndex);
  const [isReady, setIsReady] = useState(false);
  const navItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const limelightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (defaultActiveIndex < 0 || defaultActiveIndex >= items.length) return;
    setActiveIndex(defaultActiveIndex);
  }, [defaultActiveIndex, items.length]);

  useLayoutEffect(() => {
    if (items.length === 0) return undefined;

    let timer: number | undefined;

    const updateLimelightPosition = () => {
      const limelight = limelightRef.current;
      const activeItem = navItemRefs.current[activeIndex];
      if (!limelight || !activeItem) return;
      const newLeft =
        activeItem.offsetLeft + activeItem.offsetWidth / 2 - limelight.offsetWidth / 2;
      limelight.style.left = `${newLeft}px`;
    };

    updateLimelightPosition();

    if (!isReady) {
      timer = window.setTimeout(() => setIsReady(true), 50);
    }

    window.addEventListener('resize', updateLimelightPosition);

    return () => {
      window.removeEventListener('resize', updateLimelightPosition);
      if (typeof timer !== 'undefined') {
        window.clearTimeout(timer);
      }
    };
  }, [activeIndex, isReady, items]);

  if (items.length === 0) {
    return null;
  }

  const activateItem = (index: number) => {
    if (index < 0 || index >= items.length) return;
    const item = items[index];
    setActiveIndex(index);
    onTabChange?.(index);
    item?.onClick?.();
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (items.length === 0) return;

    const focusItem = (targetIndex: number) => {
      const target = navItemRefs.current[targetIndex];
      if (target) {
        target.focus();
      }
    };

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        event.preventDefault();
        const nextIndex = (index + 1) % items.length;
        activateItem(nextIndex);
        focusItem(nextIndex);
        break;
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        event.preventDefault();
        const prevIndex = (index - 1 + items.length) % items.length;
        activateItem(prevIndex);
        focusItem(prevIndex);
        break;
      }
      case 'Home': {
        event.preventDefault();
        activateItem(0);
        focusItem(0);
        break;
      }
      case 'End': {
        event.preventDefault();
        const lastIndex = items.length - 1;
        activateItem(lastIndex);
        focusItem(lastIndex);
        break;
      }
      default:
        break;
    }
  };

  return (
    <nav
      role="tablist"
      aria-orientation="horizontal"
      className={`relative inline-flex items-center h-16 rounded-lg bg-black/50 backdrop-blur-sm text-white border border-orange-500/20 px-2 ${
        className ?? ''
      }`}
    >
      {items.map(({ id, icon, label }, index) => {
        const stringId = String(id);
        const isActive = activeIndex === index;
        return (
          <button
            type="button"
            key={id}
            ref={(el) => {
              navItemRefs.current[index] = el;
            }}
            className={`relative z-20 flex h-full cursor-pointer flex-col items-center justify-center gap-2 p-5 transition-colors ${
              isActive ? 'text-orange-400' : 'text-white/60 hover:text-white/80'
            } ${iconContainerClassName ?? ''}`}
            onClick={() => activateItem(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            aria-label={label}
            title={label}
            data-active={isActive}
            id={`${stringId}-tab`}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            aria-controls={`${stringId}-panel`}
          >
            {cloneElement(icon, {
              className: `w-6 h-6 transition-all duration-200 ease-in-out ${
                isActive ? 'opacity-100 scale-110' : 'opacity-60'
              } ${icon.props.className || ''} ${iconClassName || ''}`.trim(),
            })}
            {label ? (
              <span
                className={`text-xs font-medium transition-all duration-200 ${
                  isActive ? 'opacity-100' : 'opacity-70'
                }`}
              >
                {label}
              </span>
            ) : null}
          </button>
        );
      })}

      <div
        ref={limelightRef}
        className={`absolute top-0 z-10 w-11 h-[5px] rounded-full bg-gradient-to-r from-orange-400 to-orange-600 shadow-[0_30px_40px_rgba(251,146,60,0.5)] ${
          isReady ? 'transition-[left] duration-500 ease-out' : ''
        } ${limelightClassName ?? ''}`}
        style={{ left: '-999px' }}
      >
        <div className="absolute left-[-30%] top-[5px] w-[160%] h-14 [clip-path:polygon(5%_100%,25%_0,75%_0,95%_100%)] bg-gradient-to-b from-orange-500/40 to-transparent pointer-events-none blur-sm" />
      </div>
    </nav>
  );
};
