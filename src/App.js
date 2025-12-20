import { BrowserRouter } from "react-router-dom";
import Header from "./components/Header";
import Body from "./components/Body";


function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Header />
        <Body />
      </div>
    </BrowserRouter>
  );
}

export default App;
