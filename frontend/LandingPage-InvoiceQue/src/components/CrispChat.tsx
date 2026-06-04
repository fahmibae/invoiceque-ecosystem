"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    $crisp: any[];
    CRISP_WEBSITE_ID: string;
  }
}

export default function CrispChat() {
  useEffect(() => {
    const websiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
    
    if (!websiteId) {
      console.warn("Crisp Chat: NEXT_PUBLIC_CRISP_WEBSITE_ID is not defined in environment variables.");
      return;
    }

    window.$crisp = [];
    window.CRISP_WEBSITE_ID = websiteId;

    const script = document.createElement("script");
    script.src = "https://client.crisp.chat/l.js";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // Optional cleanup if needed when component unmounts
      const scripts = document.head.getElementsByTagName("script");
      for (let i = 0; i < scripts.length; i++) {
        if (scripts[i].src === "https://client.crisp.chat/l.js") {
          document.head.removeChild(scripts[i]);
          break;
        }
      }
    };
  }, []);

  return null;
}
