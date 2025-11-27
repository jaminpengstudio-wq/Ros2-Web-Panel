import { Component } from "react";
import Toast from "./Toast";


class ToastContainer extends Component {
    render() {
        const { toasts = [] } = this.props;

        return (
            <div className="toast-container">
                {toasts.map((t) => (
                    <Toast
                        key={t.id}
                        type={t.type}
                        message={t.message}
                        duration={t.duration}
                    />
                ))}
            </div>
        );
    }
}

export default ToastContainer;
