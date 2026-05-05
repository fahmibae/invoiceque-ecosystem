import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function ClickableAmount({ text, className }: { text: string | number; className?: string }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const spanRef = React.useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!show && spanRef.current) {
      const rect = spanRef.current.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.left });
    }
    setShow(!show);
  };

  return (
    <div className="relative w-full min-w-0">
      <span 
        ref={spanRef}
        className={`cursor-pointer block w-full ${className} hover:opacity-80 transition-opacity`}
        onClick={handleClick}
        title="Klik untuk melihat penuh"
      >
        {text}
      </span>
      {show && mounted && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={(e) => { e.stopPropagation(); setShow(false); }} />
          <div 
            className="fixed z-[9999] bg-slate-800 text-white text-[13px] py-1.5 px-3 rounded shadow-xl whitespace-nowrap font-medium animate-fade-in"
            style={{ 
              top: `${pos.top - 8}px`, 
              left: `${pos.left}px`,
              transform: 'translateY(-100%)'
            }}
            onClick={(e) => { e.stopPropagation(); setShow(false); }}
          >
            {text}
            <div className="absolute top-full left-4 -mt-[1px] border-4 border-transparent border-t-slate-800"></div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
