import { createContext, useState, useEffect } from "react";

// Create a context
export const AppContext = createContext();

// Create a provider component
export const AppProvider = ({ children }) => {
  const [text, setText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [history, setHistory] = useState([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);

  // Initialize history when text changes
  useEffect(() => {
    if (text && history.length === 0) {
      setHistory([{ text, originalText: text }]);
      setCurrentHistoryIndex(0);
      setOriginalText(text);
    }
  }, [text, history.length]);

  // Update text and track history
  const updateText = (newText) => {
    // If this is a new edit (not from undo/redo)
    if (text !== newText) {
      // If we're not at the end of history, trim it
      if (currentHistoryIndex < history.length - 1) {
        setHistory(history.slice(0, currentHistoryIndex + 1));
      }

      // Save original text when user first types it
      if (
        history.length === 0 ||
        history[history.length - 1].originalText !== newText
      ) {
        setOriginalText(newText);
      }

      setText(newText);

      // Add to history
      const newHistoryItem = { text: newText, originalText: originalText };
      setHistory([...history, newHistoryItem]);
      setCurrentHistoryIndex(history.length);
    }
  };

  // Handle undo
  const handleUndo = () => {
    if (currentHistoryIndex > 0) {
      const prevIndex = currentHistoryIndex - 1;
      setCurrentHistoryIndex(prevIndex);
      setText(history[prevIndex].text);
    }
  };

  // Handle redo
  const handleRedo = () => {
    if (currentHistoryIndex < history.length - 1) {
      const nextIndex = currentHistoryIndex + 1;
      setCurrentHistoryIndex(nextIndex);
      setText(history[nextIndex].text);
    }
  };

  // Reset to original text
  const resetToOriginal = () => {
    if (originalText) {
      setText(originalText);
    }
  };

  // The context value
  const contextValue = {
    text,
    setText: updateText,
    originalText,
    setOriginalText,
    handleUndo,
    handleRedo,
    resetToOriginal,
    canUndo: currentHistoryIndex > 0,
    canRedo: currentHistoryIndex < history.length - 1,
  };

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};
