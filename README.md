# ✨ AI Tone Editor Tool

This is an interactive **AI Tone Adjustment Tool** where users can edit text and control its tone from formal to casual and concise to expanded using a 2D slider. The app integrates **Mistral AI** to process text tone and includes smooth undo/redo functionality.

🎥 **Reference Video:**  

https://github.com/user-attachments/assets/db1afa35-26a2-4a3f-8901-5c270ddafb0f

---

## 🚀 Features

- 🎯 **Text Editor** – Editable field where users input their text.
- 🧭 **2D Tone Slider** – Drag to adjust **formality (vertical)** and **verbosity (horizontal)**.
- 🔁 **Undo/Redo** – Tracks and reverts tone changes seamlessly.
- 🎛️ **Reset Button** – The reset button in the middle quickly resets tone to the original.
- ⚙️ **Mistral AI Integration** – Uses the Mistral small model for real-time tone adjustment.
- 📱 **Responsive UI** – Clean and intuitive design with loading indicators.
- ⚠️ **Error Handling** – Displays API/network issues gracefully.

---

## 🧠 Technical Architecture

### 🖥️ Frontend
- **Framework**: React
- **Context API**: For managing global state (`AppContext`)
- **UI/UX**: TailwindCSS, interactive drag-and-drop grid

### ⚙️ Backend
- **Framework**: Express.js
- **Purpose**: 
  - Proxy & secure Mistral API calls
  - Apply caching to reduce redundant requests
- **Security**: API key stored in `.env` and never exposed to frontend

---

## 🧬 State Management Approach

- `originalText`: Stored in context to track the initial input.
- `setText`: Updates current text from tone slider or editor.
- `undoStack` / `redoStack`: Maintain tone transformations and allow stepwise history navigation.
- `position`: Stores slider position to map tone.

---

## 🧯 Error Handling

- **API failures**: Displays a clear error message and disables repeat requests during failures.
- **Edge cases**:
  - **Empty input**: Blocks API request.
  - **Rapid movement**: Debounced to avoid API flooding.
  - **Network issues**: Shown with descriptive messages.

---

## 🔧 Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/sanskriti2004/ai-tone-editor.git
   cd ai-tone-editor
   ```

2. **Install dependencies**

   Install the required dependencies for both the frontend and the backend:

   - For **frontend** (client-side):
     ```bash
     cd frontend
     npm install
     ```

   - For **backend** (server-side):
     ```bash
     cd backend
     npm install
     ```

3. **Set up environment variables**

   - In the **backend** directory, create a `.env` file and add your Mistral API key:
     ```bash
     MISTRAL_API_KEY=your_mistral_api_key
     ```

4. **Run the backend server**

   Start the backend server:
   ```bash
   cd backend
   npm start
   ```

5. **Run the frontend server**

   Start the frontend server:
   ```bash
   cd frontend
   npm start
   ```

Now, open your browser to view the application.

---

## 🧪 Tradeoffs / Notes

* **Preset Buttons Omitted**: Per instructions, sliders replace the need for tone presets like "Executive" or "Educational".
* **2D Grid** provides more expressive control over tone than a single slider.

---

## 📂 Project Structure

```
/frontend
  ├── src/
  │   ├── components/
  │   ├── context/
  │   └── App.jsx
  └── index.html

/backend
  ├── index.js
  └── .env
```

---

## 🙋‍♀️ Built with ❤️ by Sanskriti
