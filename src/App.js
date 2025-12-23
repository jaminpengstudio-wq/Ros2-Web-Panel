import { BrowserRouter } from "react-router-dom";
import HeaderWithLocation from "./components/HeaderWithLocation";
import Body from "./components/Body";

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <HeaderWithLocation />
        <Body />
      </div>
    </BrowserRouter>
  );
}

export default App;
