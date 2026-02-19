import { Component } from "react";
import { Container } from "react-bootstrap";
import { Routes, Route } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import Login from "../pages/Login";
import Panel from "../pages/Panel";
import Task from "../pages/Task";

class Body extends Component {
    render() {
        return (
            <Container fluid >
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route path="/panel" element={<ProtectedRoute> <Panel /> </ProtectedRoute>} />
                    <Route path="/task" element={<ProtectedRoute> <Task /> </ProtectedRoute>} />

                </Routes>
            </Container>
        );
    }
}

export default Body;
