import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
    const isLogin = sessionStorage.getItem("isLogin") === "true";

    if (!isLogin) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default ProtectedRoute;
