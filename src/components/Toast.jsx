import { Component } from "react";


class Toast extends Component {
    state = { visible: true };

    componentDidMount() {
        const { duration = 3000 } = this.props;
        this.timer = setTimeout(() => this.setState({ visible: false }), duration);
    }

    componentWillUnmount() {
        clearTimeout(this.timer);
    }

    render() {
        const { message = "測試", type = "success" } = this.props;
        const { visible } = this.state;
        if (!visible) return null;

        // 根據 type 選顏色
        const colors = {
            success: "#0dd286ff", // 綠
            warning: "#f7c110ff",   // 黃
            error: "#ff4444",   // 紅
        };

        // 若 type 未定義 → 使用紅色 (default error)
        const bgColor = colors[type] || colors.error;

        return (
            <div className="toast-box" style={{ backgroundColor: bgColor }}>
                {message}
            </div>
        );
    }
}

export default Toast;
