export default function TextEditor() {
  return (
    <textarea
      className="w-[500px] h-[400px] p-6 bg-gray-50 border border-gray-300 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ease-in-out"
      placeholder="Type or paste your text here..."
    />
  );
}
