import { useRef, useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContext } from "../context/AppProvider";

export default function ToneSlider() {
  const gridRef = useRef(null);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState(null);
  const { setText, originalText } = useContext(AppContext);
  const debounceTimerRef = useRef(null);

  const handleReset = () => {
    setPosition({ x: 50, y: 50 });
    setMetrics(null);

    // If there's original text, restore it
    if (originalText) {
      setText(originalText);
    }
  };

  const handleMove = (e) => {
    const rect = gridRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setPosition({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    });

    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer for automatic tone adjustment
    debounceTimerRef.current = setTimeout(() => {
      adjustTone();
    }, 500);
  };

  const handleToneChange = () => {
    adjustTone();
  };

  // Function to call the backend API with two-dimensional tone data
  const adjustTone = async () => {
    // Skip if no text to adjust
    if (!originalText || originalText.trim() === "") {
      return;
    }

    // Calculate formality level (0-100) - top is professional (0), bottom is casual (100)
    const formalityLevel = Math.min(100, Math.max(0, position.y));

    // Calculate verbosity level (0-100) - left is concise (0), right is expanded (100)
    // Apply extra weighting to ensure extreme conciseness when near 0
    let verbosityLevel = Math.min(100, Math.max(0, position.x));

    // Apply more aggressive scaling to verbosity to ensure conciseness
    if (verbosityLevel < 30) {
      // Make low verbosity values even lower to enforce extreme conciseness
      verbosityLevel = verbosityLevel * 0.5; // This makes 20% become 10%, etc.
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.post(
        "http://localhost:3001/api/adjust-tone",
        {
          text: originalText,
          formalityLevel,
          verbosityLevel,
        }
      );

      // Update the text with the adjusted version
      setText(response.data.result);

      // Update metrics if available
      if (response.data.metrics) {
        setMetrics(response.data.metrics);
      } else {
        setMetrics(null);
      }
    } catch (err) {
      console.error("Error adjusting tone:", err);
      setError(
        err.response?.data?.error || "Failed to adjust tone. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Get the highlight class for cells based on proximity to position
  const getCellHighlight = (cellX, cellY) => {
    // Map cell coordinates to percentage coordinates (center of cell)
    const cellCenterX = cellX * 33.33 + 16.67;
    const cellCenterY = cellY * 33.33 + 16.67;

    // Calculate distance from position to cell center
    const distance = Math.sqrt(
      Math.pow(position.x - cellCenterX, 2) +
        Math.pow(position.y - cellCenterY, 2)
    );

    // Return highlight class based on distance
    if (distance < 20) return "bg-blue-100";
    return "";
  };

  return (
    <div className="flex flex-col items-center">
      {/* Grid for tone slider */}
      <div
        ref={gridRef}
        className="relative w-72 h-72 bg-gray-100 grid grid-cols-3 grid-rows-3 border border-gray-300 rounded-sm"
        onMouseDown={(e) => {
          handleMove(e); // Update position immediately on click

          const move = (e) => handleMove(e);
          const stop = () => {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", stop);
          };
          window.addEventListener("mousemove", move);
          window.addEventListener("mouseup", stop);
        }}
      >
        {/* Grid borders and cells */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 border-t border-l border-gray-300 rounded-sm">
          {/* Top row - Professional */}
          <div
            className={`border-r border-b border-gray-300 ${getCellHighlight(
              0,
              0
            )}`}
          >
            <span className="text-xs absolute top-3 left-3">
              Prof. & Concise
            </span>
          </div>
          <div
            className={`border-r border-b border-gray-300 ${getCellHighlight(
              1,
              0
            )}`}
          ></div>
          <div className={`border-b border-gray-300 ${getCellHighlight(2, 0)}`}>
            <span className="text-xs absolute top-3 right-3">
              Prof. & Expanded
            </span>
          </div>

          {/* Middle row */}
          <div
            className={`border-r border-b border-gray-300 ${getCellHighlight(
              0,
              1
            )}`}
          ></div>
          <div
            className={`border-r border-b border-gray-300 ${getCellHighlight(
              1,
              1
            )}`}
          ></div>
          <div
            className={`border-b border-gray-300 ${getCellHighlight(2, 1)}`}
          ></div>

          {/* Bottom row - Casual */}
          <div className={`border-r border-gray-300 ${getCellHighlight(0, 2)}`}>
            <span className="text-xs absolute bottom-3 left-3">
              Casual & Concise
            </span>
          </div>
          <div
            className={`border-r border-gray-300 ${getCellHighlight(1, 2)}`}
          ></div>
          <div className={`${getCellHighlight(2, 2)}`}>
            <span className="text-xs absolute bottom-3 right-3">
              Casual & Expanded
            </span>
          </div>
        </div>

        {/* Circle representing tone adjustment */}
        <div
          className="absolute z-10 w-5 h-5 bg-blue-500 border-2 border-white rounded-full shadow-md cursor-pointer"
          style={{
            left: `calc(${position.x}% - 10px)`,
            top: `calc(${position.y}% - 10px)`,
          }}
        />

        {/* Labels */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs font-medium">
          Professional
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-medium">
          Casual
        </div>
        <div className="absolute top-1/2 left-2 text-xs font-medium -translate-y-1/2 transform -rotate-90 origin-center">
          Concise
        </div>
        <div className="absolute top-1/2 right-2 text-xs font-medium -translate-y-1/2 transform rotate-90 origin-center">
          Expanded
        </div>

        {/* Reset Button */}
        <button
          onClick={handleReset}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-2 rounded-full bg-white bg-opacity-80 hover:bg-opacity-100 shadow-sm"
        >
          <img src="/reset.png" alt="reset" className="w-4 h-4" />
        </button>
      </div>

      {/* Tone coordinates debug (optional) */}
      <div className="text-xs text-gray-500 mt-2">
        Formality: {Math.round(position.y)}% (0% = Professional, 100% = Casual)
        <br />
        Verbosity: {Math.round(position.x)}% (0% = Concise, 100% = Expanded)
      </div>

      {/* Adjust Tone Button */}
      <button
        onClick={handleToneChange}
        disabled={loading}
        className={`mt-4 px-4 py-2 bg-blue-500 text-white rounded-md ${
          loading ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-600"
        }`}
      >
        {loading ? "Adjusting..." : "Adjust Tone"}
      </button>

      {/* Error Message */}
      {error && <div className="mt-4 text-red-500">{error}</div>}

      {/* Word Count Metrics */}
      {metrics && (
        <div className="mt-3 p-3 bg-gray-50 rounded-md text-sm">
          <div className="font-medium">Text Analysis:</div>
          <div className="flex justify-between">
            <span>Original: {metrics.originalWordCount} words</span>
            <span>New: {metrics.resultWordCount} words</span>
          </div>
          <div
            className={`text-${
              metrics.isMoreConcise ? "green" : "blue"
            }-600 font-medium`}
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
