import TextEditor from "./components/TextEditor";
import Toolbar from "./components/Toolbar";
import { AppProvider } from "./context/AppProvider";

function App() {
  return (
    <AppProvider>
      <div className="flex items-center justify-center bg-gray-100 gap-10 min-h-screen p-8">
        <TextEditor />
        <div className="flex flex-col gap-4">
          <Toolbar />
        </div>
      </div>
    </AppProvider>
  );
}

export default App;
