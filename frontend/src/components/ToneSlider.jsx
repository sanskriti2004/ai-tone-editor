import { useRef, useState } from "react";

export default function ToneGridSlider() {
  const gridRef = useRef(null);
  const [position, setPosition] = useState({ x: 50, y: 50 }); // Percent values
  const [highlightedCells, setHighlightedCells] = useState(new Set());

  const handleReset = () => {
    setPosition({ x: 50, y: 50 });
    setHighlightedCells(new Set()); // Reset highlighted cells on reset
  };

  const handleMove = (e) => {
    const rect = gridRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setPosition({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    });

    // Calculate the cell the circle is over
    const xCell = Math.floor((x / 100) * 3); // x is 0 to 100, divide by 100 to get grid percentage
    const yCell = Math.floor((y / 100) * 3);

    // Get all adjacent cells and current cell (including middle, corner, and edge effects)
    const newHighlightedCells = new Set([
      `${xCell},${yCell}`, // Current cell
      `${xCell - 1},${yCell}`, // Left
      `${xCell + 1},${yCell}`, // Right
      `${xCell},${yCell - 1}`, // Top
      `${xCell},${yCell + 1}`, // Bottom
    ]);

    // Special logic for when in the middle area of the grid
    if (xCell === 1 && yCell === 1) {
      newHighlightedCells.add("0,1"); // Add the "Professional" label
      newHighlightedCells.add("2,1"); // Add the "Expanded" label
    }

    setHighlightedCells(newHighlightedCells);
  };

  return (
    <div className="flex flex-col items-center">
      <div
        ref={gridRef}
        className="relative w-72 h-72 bg-gray-100 grid grid-cols-3 grid-rows-3 border border-gray-300 rounded-sm"
        onMouseDown={(e) => {
          const move = (e) => handleMove(e);
          const stop = () => {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", stop);
          };
          window.addEventListener("mousemove", move);
          window.addEventListener("mouseup", stop);
        }}
      >
        {/* Add the grid borders using Tailwind */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 border-t border-l border-gray-300 rounded-sm">
          {/* Empty cells to create borders between grid lines */}
          <div className="border-r border-b border-gray-300"></div>
          <div className="border-r border-b border-gray-300"></div>
          <div className="border-b border-gray-300"></div>

          <div className="border-r border-b border-gray-300"></div>
          <div className="border-r border-b border-gray-300"></div>
          <div className="border-b border-gray-300"></div>

          <div className="border-r border-gray-300"></div>
          <div className="border-r border-gray-300"></div>
          <div></div>
        </div>

        {/* Circle */}
        <div
          className="absolute z-10 w-5 h-5 bg-blue-500 border-2 border-white rounded-full shadow-md cursor-pointer"
          style={{
            left: `calc(${position.x}% - 10px)`,
            top: `calc(${position.y}% - 10px)`,
          }}
        />

        {/* Labels */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs">
          Professional
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs">
          Casual
        </div>

        {/* Concise label - rotated and aligned to the top */}
        <div className="absolute top-41.5 left-2 text-xs transform -rotate-90 origin-top-left w-16">
          Concise
        </div>

        {/* Expanded label - rotated and aligned to the top */}
        <div className="absolute top-44.5 right-2 text-xs transform rotate-90 origin-top-right w-16">
          Expanded
        </div>

        {/* Reset Button */}
        <button
          onClick={handleReset}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-sm text-xs cursor-pointer bg-transparent border-0"
        >
          <img src="/reset.png" alt="resets" className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
