import { useLocation } from "react-router-dom";
import Header from "./Header";

function HeaderWithLocation(props) {
    const location = useLocation();
    return <Header {...props} location={location} />;
}

export default HeaderWithLocation;
