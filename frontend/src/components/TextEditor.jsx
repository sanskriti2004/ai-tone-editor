import React, { useContext } from "react";
import { AppContext } from "../context/AppProvider";

// TextEditor component to handle text input and display
function TextEditor() {
  // Accessing context values to manage text and originalText state
  const { text, setText, setOriginalText } = useContext(AppContext);

  // Handles change in the text area and updates the context
  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText); // Update the current text
    setOriginalText(newText); // Store original text for reset functionality
  };

  return (
    <div className="text-editor w-full sm:w-[320px] md:w-[500px]">
      {/* Textarea for user to input text */}
      <textarea
        value={text} // Bind the textarea value to the context text state
        onChange={handleTextChange} // Call handleTextChange on input change
        placeholder="Type or paste your text here..."
        className="
          w-full h-[300px] sm:h-[200px] md:h-[400px] 
          p-4 sm:p-6 bg-gray-50 
          border border-gray-300 rounded-lg shadow-lg 
          focus:outline-none focus:ring-2 focus:ring-blue-500 
          focus:border-blue-500 transition-all ease-in-out
        "
      />
    </div>
  );
}

export default TextEditor;
