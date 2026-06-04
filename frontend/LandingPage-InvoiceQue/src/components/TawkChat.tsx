"use client";

import { useEffect } from "react";

export default function TawkChat() {
  useEffect(() => {
    const propertyId = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID;
    const widgetId = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID;

    if (!propertyId || !widgetId) {
      console.warn(
        "Tawk.to Chat: NEXT_PUBLIC_TAWK_PROPERTY_ID or NEXT_PUBLIC_TAWK_WIDGET_ID is not defined in environment variables."
      );
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");
    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const scripts = document.head.getElementsByTagName("script");
      for (let i = 0; i < scripts.length; i++) {
        if (scripts[i].src === `https://embed.tawk.to/${propertyId}/${widgetId}`) {
          document.head.removeChild(scripts[i]);
          break;
        }
      }
    };
  }, []);

  return null;
}
