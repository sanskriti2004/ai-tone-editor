import TextEditor from "./components/TextEditor";
import Toolbar from "./components/Toolbar";
import { AppProvider } from "./context/AppProvider";

// Main App component that wraps everything inside the AppProvider context
function App() {
  return (
    // Wrap the entire app inside the AppProvider to manage the shared state
    <AppProvider>
      <div className="flex flex-col md:flex-row items-center justify-center bg-gray-100 gap-10 min-h-screen p-8">
        {/* TextEditor component that handles text input and manipulation */}
        <TextEditor />

        {/* Toolbar component that contains various tools for adjusting text */}
        <div className="flex flex-col gap-4">
          <Toolbar />
        </div>
      </div>
    </AppProvider>
  );
}

export default App;
