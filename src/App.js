import { BrowserRouter } from "react-router-dom";
import Header from "./components/Header";
import Body from "./components/Body";
// import Footer from "./components/Footer";

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
