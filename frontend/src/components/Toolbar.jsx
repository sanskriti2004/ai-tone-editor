import { useContext } from "react";
import ToneSlider from "./ToneSlider";
import { AppContext } from "../context/AppProvider";

export default function Toolbar() {
  const { handleUndo, handleRedo, canUndo, canRedo } = useContext(AppContext);

  return (
    <div className="flex flex-col bg-white rounded-lg shadow-md w-full max-w-sm sm:w-80 mx-auto sm:mx-0">
      {/* Header */}
      <div className="font-medium text-md py-4 px-4 border-b border-gray-300">
        Adjust Tone
      </div>

      {/* Sliders */}
      <div className="p-5">
        <ToneSlider />
      </div>

      {/* Undo / Redo Controls */}
      <div className="px-5 pb-5 flex justify-center gap-2">
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className={`px-3 py-1 text-sm rounded bg-gray-200 transition ${
            !canUndo
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-gray-300 hover:shadow"
          }`}
        >
          Undo
        </button>
        <button
          onClick={handleRedo}
          disabled={!canRedo}
          className={`px-3 py-1 text-sm rounded bg-gray-200 transition ${
            !canRedo
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-gray-300 hover:shadow"
          }`}
        >
          Redo
        </button>
      </div>
    </div>
  );
}
