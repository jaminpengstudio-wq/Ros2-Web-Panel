import { Component } from "react";
import { Container } from "react-bootstrap";
import { Routes, Route } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import Login from "../pages/Login";
import Panel from "../pages/Panel";

class Body extends Component {
    render() {
        return (
            <Container fluid >
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route
                        path="/panel"
                        element={
                            <ProtectedRoute>
                                <Panel />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </Container>
        );
    }
}

export default Body;
