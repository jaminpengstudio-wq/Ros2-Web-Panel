import { Component } from "react";
import { Container } from "react-bootstrap";
import { Routes, Route } from "react-router-dom";
import Home from "./Home";
import Panel from "./Panel";


class Body extends Component {
    render() {
        return (
            <Container fluid className="p-3">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/panel" element={<Panel />} />
                </Routes>
            </Container>
        );
    }
}

export default Body;
