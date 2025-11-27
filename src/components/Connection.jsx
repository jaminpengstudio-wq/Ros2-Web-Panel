import { Component } from "react";
import Alert from "react-bootstrap/Alert";
import rosService from "../scripts/RosService";


class Connection extends Component {
    state = { connected: undefined, show: true };

    componentDidMount() {
        // 監聽連線狀態
        this.interval = setInterval(() => {
            const isConn = rosService.isConnected();
            if (isConn !== this.state.connected) {
                this.setState({ connected: isConn, show: true });

                if (isConn === true) {
                    clearTimeout(this.hideTimer);
                    this.hideTimer = setTimeout(() => {
                        this.setState({ show: false });
                    }, 1500);
                }
            }
        }, 1000);
    }

    componentWillUnmount() {
        clearInterval(this.interval);
        clearTimeout(this.hideTimer);
    }

    render() {
        const { connected, show } = this.state;
        if (!show && connected) return null;

        const className = `connection-alert text-center mb-0 ${connected === undefined
            ? "connecting"
            : connected
                ? "connected"
                : "disconnected"
            }`;

        const text = connected === undefined
            ? "Connecting..."
            : connected
                ? "Connected"
                : "Disconnected";

        return (
            <div className="mb-0">
                <Alert className={className}>
                    {text}
                </Alert>
            </div>
        );
    }
}

export default Connection;
