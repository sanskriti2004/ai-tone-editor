import ToneSlider from "./ToneSlider";

export default function Toolbar() {
  return (
    <div className="flex flex-col bg-white rounded-lg shadow-md w-80">
      <div className="font-medium text-md py-4 px-4 border-b border-gray-300">
        Adjust Tone
      </div>

      <div className="p-5">
        <ToneSlider />
      </div>
    </div>
  );
}
