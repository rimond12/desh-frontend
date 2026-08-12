/**
 * CalcTableScroller.jsx
 *
 * Shared, reusable horizontally-scrollable wrapper for every calc-engine table.
 * Provides:
 *   - overflow-x: auto scrolling (via ce-table-scroll-wrap)
 *   - Right-edge fade shadow that appears when columns are hidden off-screen
 *     and disappears once fully scrolled to the end (via ce-table-outer +
 *     ce-table-scroll-shadow toggled by JS)
 *   - Custom themed scrollbar (styled in calcEngine.css)
 *
 * Usage:
 *   <CalcTableScroller>
 *     <table className="ce-table">...</table>
 *   </CalcTableScroller>
 *
 * Zero business logic - drop it around any <table> and it "just works".
 */
import { useState, useEffect, useRef } from "react";

export default function CalcTableScroller({ children, className = "" }) {
  const scrollRef = useRef(null);
  const [showRightShadow, setShowRightShadow] = useState(true);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    // Shadow disappears when within 2px of the right end
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    setShowRightShadow(!atEnd);
  }

  // Re-evaluate shadow whenever anything re-renders (e.g. new row added,
  // columns toggled) - not just on user scroll events.
  useEffect(() => {
    handleScroll();
  });

  return (
    <div
      className={`ce-table-outer${showRightShadow ? " ce-table-scroll-shadow" : ""}${className ? " " + className : ""}`}
    >
      <div
        className="ce-table-scroll-wrap"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        {children}
      </div>
    </div>
  );
}
