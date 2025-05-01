import React, { useContext } from "react";
import { AppContext } from "../context/AppProvider";

function TextEditor() {
  const { text, setText, setOriginalText } = useContext(AppContext);

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    setOriginalText(newText); // Store original text for reset functionality
  };

  return (
    <div className="text-editor">
      <textarea
        value={text}
        onChange={handleTextChange}
        placeholder="Type or paste your text here..."
        className="w-[500px] h-[400px] p-6 bg-gray-50 border border-gray-300 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ease-in-out"
      />
    </div>
  );
}

export default TextEditor;
