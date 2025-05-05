import { useRef, useState, useContext } from "react";
import axios from "axios";
import { AppContext } from "../context/AppProvider";

export default function ToneSlider() {
  const gridRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState(null);

  const { setText, originalText } = useContext(AppContext);

  // Reset position and restore original text
  const handleReset = () => {
    setPosition({ x: 50, y: 50 });
    setMetrics(null);
    if (originalText) setText(originalText);
  };

  // Move handle within grid
  const handleMove = (e) => {
    const rect = gridRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setPosition({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    });

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      adjustTone();
    }, 500);
  };

  // Manual trigger for tone change
  const handleToneChange = () => {
    adjustTone();
  };

  // API call to adjust tone
  const adjustTone = async () => {
    if (!originalText || originalText.trim() === "") return;

    let formalityLevel = Math.min(100, Math.max(0, position.y));
    let verbosityLevel = Math.min(100, Math.max(0, position.x));
    if (verbosityLevel < 30) verbosityLevel *= 0.5;

    setLoading(true);
    setError("");

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}api/adjust-tone`,
        {
          text: originalText,
          formalityLevel,
          verbosityLevel,
        }
      );

      setText(res.data.result);
      setMetrics(res.data.metrics || null);
    } catch (err) {
      console.error("Tone adjustment failed:", err);
      setError(
        err.response?.data?.error || "Failed to adjust tone. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Highlight cell based on cursor proximity
  const getCellHighlight = (cellX, cellY) => {
    const cellCenterX = cellX * 33.33 + 16.67;
    const cellCenterY = cellY * 33.33 + 16.67;

    const distance = Math.sqrt(
      Math.pow(position.x - cellCenterX, 2) +
        Math.pow(position.y - cellCenterY, 2)
    );

    return distance < 20 ? "bg-blue-100" : "";
  };

  return (
    <div className="flex flex-col items-center w-full sm:w-auto">
      {/* === Tone Grid === */}
      <div
        ref={gridRef}
        className="relative w-64 h-64 sm:w-72 sm:h-72 bg-gray-100 grid grid-cols-3 grid-rows-3 border border-gray-300 rounded-sm"
        onMouseDown={(e) => {
          handleMove(e);
          const move = (e) => handleMove(e);
          const stop = () => {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", stop);
          };
          window.addEventListener("mousemove", move);
          window.addEventListener("mouseup", stop);
        }}
      >
        {/* === Grid Cells === */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 border-t border-l border-gray-300 rounded-sm">
          {[0, 1, 2].map((row) =>
            [0, 1, 2].map((col) => (
              <div
                key={`${row}-${col}`}
                className={`border-gray-300 ${col < 2 ? "border-r" : ""} ${
                  row < 2 ? "border-b" : ""
                } ${getCellHighlight(col, row)}`}
              />
            ))
          )}
        </div>

        {/* === Draggable Handle === */}
        <div
          className="absolute z-10 w-5 h-5 bg-blue-500 border-2 border-white rounded-full shadow-md cursor-pointer"
          style={{
            left: `calc(${position.x}% - 10px)`,
            top: `calc(${position.y}% - 10px)`,
          }}
        />

        {/* === Grid Labels === */}
        <div
          className={`absolute top-2 left-1/2 -translate-x-1/2 text-xs font-medium ${
            position.y < 33.33 ? "text-gray-900" : "text-gray-400"
          }`}
        >
          Professional
        </div>
        <div
          className={`absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-medium ${
            position.y > 66.66 ? "text-gray-900" : "text-gray-400"
          }`}
        >
          Casual
        </div>
        <div
          className={`absolute top-36 right-63 -translate-y-1/2 -rotate-90 text-xs font-medium ${
            position.x < 33.33 ? "text-gray-900" : "text-gray-400"
          }`}
        >
          Concise
        </div>
        <div
          className={`absolute top-36 left-62 -translate-y-1/2 rotate-90 text-xs font-medium ${
            position.x > 66.66 ? "text-gray-900" : "text-gray-400"
          }`}
        >
          Expanded
        </div>

        {/* === Reset Button === */}
        <button
          onClick={handleReset}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-2 rounded-full bg-white bg-opacity-80 hover:bg-opacity-100 shadow-sm"
          aria-label="Reset tone"
        >
          <img src="/reset.png" alt="Reset" className="w-4 h-4" />
        </button>
      </div>

      {/* === Slider Metrics (Debug Info) === */}
      <div className="text-xs text-gray-500 mt-2 text-center">
        Formality: {Math.round(position.y)}% (0 = Professional, 100 = Casual)
        <br />
        Verbosity: {Math.round(position.x)}% (0 = Concise, 100 = Expanded)
      </div>

      {/* === Adjust Tone Button === */}
      <button
        onClick={handleToneChange}
        disabled={loading}
        className={`mt-4 px-4 py-2 bg-blue-500 text-white rounded-md ${
          loading ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-600"
        }`}
      >
        {loading ? "Adjusting..." : "Adjust Tone"}
      </button>

      {/* === Error Message === */}
      {error && <div className="mt-4 text-red-500 text-sm">{error}</div>}

      {/* === Word Count Metrics === */}
      {metrics && (
        <div className="mt-3 p-3 bg-gray-50 rounded-md text-sm w-full max-w-xs">
          <div className="font-medium mb-1">Text Analysis:</div>
          <div className="flex justify-between">
            <span>Original: {metrics.originalWordCount} words</span>
            <span>New: {metrics.resultWordCount} words</span>
          </div>
          <div
            className={`mt-1 font-medium text-${
              metrics.isMoreConcise ? "green" : "blue"
            }-600`}
          >
            {metrics.isMoreConcise
              ? `${Math.abs(metrics.percentageChange)}% more concise`
              : `${metrics.percentageChange}% more expanded`}
          </div>
          {metrics.required2ndPass && (
            <div className="text-xs text-gray-500 mt-1">
              Extra conciseness enforced
            </div>
          )}
        </div>
      )}
    </div>
  );
}
