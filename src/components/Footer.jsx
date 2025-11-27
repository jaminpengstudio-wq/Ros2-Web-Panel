import { Component } from "react";
import { Container } from "react-bootstrap";


class Footer extends Component {
    state = {};
    render() {
        return (
            <Container className="text-center">
                <span className="footer">
                    Carbot Panel Lab © 2025
                </span>
            </Container>
        );
    }
}

export default Footer;
