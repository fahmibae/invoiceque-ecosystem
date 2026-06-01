"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight01Icon,
  ArrowLeft01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  RocketIcon,
} from "hugeicons-react";

export interface TourStep {
  /** CSS selector for the target element to highlight */
  target: string;
  /** Title of this step */
  title: string;
  /** Description text */
  description: string;
  /** Preferred tooltip placement */
  placement?: "top" | "bottom" | "left" | "right";
}

interface TourGuideProps {
  /** Array of tour steps */
  steps: TourStep[];
  /** localStorage key to remember completion */
  storageKey?: string;
  /** Callback when tour completes */
  onComplete?: () => void;
}

export default function TourGuide({
  steps,
  storageKey = "iq_tour_completed",
  onComplete,
}: TourGuideProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Check if tour should show
  useEffect(() => {
    setMounted(true);
    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      // Delay start so the page loads first
      const timer = setTimeout(() => setIsActive(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  // Position the tooltip relative to the target element
  const positionTooltip = useCallback(() => {
    if (!isActive || currentStep >= steps.length) return;

    const step = steps[currentStep];
    const el = document.querySelector(step.target);
    if (!el) {
      // Element not found, skip to next or end
      if (currentStep < steps.length - 1) {
        setCurrentStep((s) => s + 1);
      } else {
        completeTour();
      }
      return;
    }

    const rect = el.getBoundingClientRect();
    setTargetRect(rect);

    // Scroll element into view
    el.scrollIntoView({ behavior: "smooth", block: "center" });

    // Calculate tooltip position after a small delay for scroll
    requestAnimationFrame(() => {
      const updatedRect = el.getBoundingClientRect();
      setTargetRect(updatedRect);

      const tooltipWidth = 340;
      const tooltipHeight = 200;
      const padding = 16;
      const placement = step.placement || "bottom";

      let top = 0;
      let left = 0;

      switch (placement) {
        case "bottom":
          top = updatedRect.bottom + padding;
          left = updatedRect.left + updatedRect.width / 2 - tooltipWidth / 2;
          break;
        case "top":
          top = updatedRect.top - tooltipHeight - padding;
          left = updatedRect.left + updatedRect.width / 2 - tooltipWidth / 2;
          break;
        case "right":
          top = updatedRect.top + updatedRect.height / 2 - tooltipHeight / 2;
          left = updatedRect.right + padding;
          break;
        case "left":
          top = updatedRect.top + updatedRect.height / 2 - tooltipHeight / 2;
          left = updatedRect.left - tooltipWidth - padding;
          break;
      }

      // Clamp to viewport
      left = Math.max(
        12,
        Math.min(left, window.innerWidth - tooltipWidth - 12),
      );
      top = Math.max(
        12,
        Math.min(top, window.innerHeight - tooltipHeight - 12),
      );

      setTooltipStyle({ top, left, width: tooltipWidth });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, currentStep, steps]);

  useEffect(() => {
    positionTooltip();
    window.addEventListener("resize", positionTooltip);
    window.addEventListener("scroll", positionTooltip, true);
    return () => {
      window.removeEventListener("resize", positionTooltip);
      window.removeEventListener("scroll", positionTooltip, true);
    };
  }, [positionTooltip]);

  const completeTour = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(storageKey, "true");
    onComplete?.();
  }, [storageKey, onComplete]);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const skipTour = () => {
    completeTour();
  };

  if (!mounted || !isActive || !targetRect) return null;

  const step = steps[currentStep];
  const spotPad = 8;

  return createPortal(
    <div
      className="tour-guide-overlay"
      style={{ position: "fixed", inset: 0, zIndex: 9999 }}
    >
      {/* Dark overlay with spotlight cutout */}
      <svg
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 9999,
        }}
        onClick={skipTour}
      >
        <defs>
          <mask id="tour-spotlight">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={targetRect.left - spotPad}
              y={targetRect.top - spotPad}
              width={targetRect.width + spotPad * 2}
              height={targetRect.height + spotPad * 2}
              rx="12"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.75)"
          mask="url(#tour-spotlight)"
          style={{ transition: "all 0.3s ease" }}
        />
      </svg>

      {/* Spotlight ring/glow */}
      <div
        style={{
          position: "fixed",
          left: targetRect.left - spotPad,
          top: targetRect.top - spotPad,
          width: targetRect.width + spotPad * 2,
          height: targetRect.height + spotPad * 2,
          borderRadius: 12,
          border: "2px solid rgba(99, 102, 241, 0.6)",
          boxShadow:
            "0 0 0 4px rgba(99, 102, 241, 0.15), 0 0 30px rgba(99, 102, 241, 0.2)",
          zIndex: 10000,
          pointerEvents: "none",
          transition: "all 0.3s ease",
        }}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={{
          position: "fixed",
          ...tooltipStyle,
          zIndex: 10001,
          transition: "all 0.3s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            background: "var(--bg-card, #1e293b)",
            border: "1px solid var(--border-color, rgba(255,255,255,0.1))",
            borderRadius: 16,
            padding: "20px 24px",
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(99,102,241,0.1)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <RocketIcon width={16} height={16} color="white" />
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text-tertiary, #94a3b8)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Step {currentStep + 1} / {steps.length}
              </span>
            </div>
            <button
              onClick={skipTour}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-tertiary, #94a3b8)",
              }}
              title="Skip tour"
            >
              <Cancel01Icon width={16} height={16} />
            </button>
          </div>

          {/* Content */}
          <h4
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "var(--text-primary, white)",
              margin: "0 0 6px",
              lineHeight: 1.3,
            }}
          >
            {step.title}
          </h4>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary, #cbd5e1)",
              margin: "0 0 16px",
              lineHeight: 1.6,
            }}
          >
            {step.description}
          </p>

          {/* Progress bar */}
          <div
            style={{
              height: 3,
              background: "var(--bg-secondary, rgba(255,255,255,0.05))",
              borderRadius: 99,
              marginBottom: 16,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 99,
                background: "linear-gradient(90deg, #6366F1, #8B5CF6)",
                width: `${((currentStep + 1) / steps.length) * 100}%`,
                transition: "width 0.3s ease",
              }}
            />
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <button
              onClick={skipTour}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-tertiary, #94a3b8)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "6px 0",
              }}
            >
              Lewati Tour
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              {currentStep > 0 && (
                <button
                  onClick={prevStep}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "8px 14px",
                    borderRadius: 10,
                    border:
                      "1px solid var(--border-color, rgba(255,255,255,0.1))",
                    background: "transparent",
                    color: "var(--text-primary, white)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <ArrowLeft01Icon width={14} height={14} />
                  Prev
                </button>
              )}
              <button
                onClick={nextStep}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "8px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                  color: "white",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
                }}
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <CheckmarkCircle02Icon width={14} height={14} />
                    Selesai
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight01Icon width={14} height={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Hook to manually trigger tour reset (for settings/help menu) */
export function useResetTour(storageKey = "iq_tour_completed") {
  return useCallback(() => {
    localStorage.removeItem(storageKey);
    window.location.reload();
  }, [storageKey]);
}
