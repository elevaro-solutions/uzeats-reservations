'use client';

import { useEffect, useState } from 'react';
import { RESTAURANT_SECTIONS, useRestaurantPageParams, type RestaurantSection } from '@/lib/useRestaurantPageParams';

const SECTIONS: Array<{ id: RestaurantSection; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'menu', label: 'Menu' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'photos', label: 'Photos' },
  { id: 'details', label: 'Details' },
  { id: 'terms', label: 'Terms' },
  { id: 'faq', label: 'FAQ' },
];

export function RestaurantSectionNav() {
  const { section, setSection } = useRestaurantPageParams();
  const [scrollActive, setScrollActive] = useState<RestaurantSection>(section);

  useEffect(() => {
    setScrollActive(section);
  }, [section]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const visible = new Map<string, number>();

    RESTAURANT_SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            visible.set(id, entry.intersectionRatio);
          } else {
            visible.delete(id);
          }
          let best: RestaurantSection = 'overview';
          let bestRatio = 0;
          visible.forEach((ratio, sectionId) => {
            if (ratio > bestRatio && RESTAURANT_SECTIONS.includes(sectionId as RestaurantSection)) {
              bestRatio = ratio;
              best = sectionId as RestaurantSection;
            }
          });
          setScrollActive(best);
        },
        { rootMargin: '-120px 0px -60% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const goTo = (id: RestaurantSection) => {
    setSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const active = scrollActive;

  return (
    <nav className="rt-restaurant-nav" aria-label="Restaurant sections">
      {SECTIONS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className={`rt-restaurant-nav__item${active === id ? ' rt-restaurant-nav__item--active' : ''}`}
          onClick={() => goTo(id)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
