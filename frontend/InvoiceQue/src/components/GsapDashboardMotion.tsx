"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";

function shouldReduceMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function GsapDashboardMotion() {
  const pathname = usePathname();

  useEffect(() => {
    if (shouldReduceMotion()) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-gsap-sidebar]",
        { autoAlpha: 0, x: -18 },
        { autoAlpha: 1, x: 0, duration: 0.55, ease: "power3.out" },
      );
      gsap.fromTo(
        "[data-gsap-header]",
        { autoAlpha: 0, y: -12 },
        { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out", delay: 0.05 },
      );
      gsap.fromTo(
        "[data-gsap-nav-item]",
        { autoAlpha: 0, x: -10 },
        {
          autoAlpha: 1,
          x: 0,
          duration: 0.38,
          stagger: 0.035,
          ease: "power3.out",
          delay: 0.12,
        },
      );
    });

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (shouldReduceMotion()) return;

    const page = document.querySelector<HTMLElement>("[data-gsap-page]");
    if (!page) return;

    const pageChildren = gsap.utils.toArray<HTMLElement>(
      "[data-gsap-page] > *",
    );
    const hoverItems = gsap.utils.toArray<HTMLElement>("[data-gsap-hover]");
    const cleanups: Array<() => void> = [];

    gsap.killTweensOf([page, ...pageChildren]);
    gsap.set(page, { transformOrigin: "50% 0%" });

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.fromTo(
      page,
      { autoAlpha: 0, y: 16, filter: "blur(10px)" },
      { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.48 },
    );

    if (pageChildren.length) {
      tl.fromTo(
        pageChildren,
        { autoAlpha: 0, y: 14, scale: 0.99 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.42, stagger: 0.04 },
        "-=0.28",
      );
    }

    hoverItems.forEach((item) => {
      const onEnter = () => {
        gsap.to(item, {
          y: -2,
          scale: 1.015,
          duration: 0.22,
          ease: "power2.out",
        });
      };
      const onLeave = () => {
        gsap.to(item, { y: 0, scale: 1, duration: 0.25, ease: "power2.out" });
      };

      item.addEventListener("mouseenter", onEnter);
      item.addEventListener("mouseleave", onLeave);
      cleanups.push(() => {
        item.removeEventListener("mouseenter", onEnter);
        item.removeEventListener("mouseleave", onLeave);
      });
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      tl.kill();
    };
  }, [pathname]);

  return null;
}
