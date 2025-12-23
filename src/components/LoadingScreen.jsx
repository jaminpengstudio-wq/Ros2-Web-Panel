import { Component } from "react";

class LoadingScreen extends Component {
    constructor(props) {
        super(props);
        this.state = {
            percent: 0,
        };
        this.timer = null;
    }

    componentDidMount() {
        const { duration = 5000 } = this.props; // 預設 5 秒
        const stepTime = 50; // 每 50ms 更新一次
        const steps = duration / stepTime;
        let currentStep = 0;

        this.timer = setInterval(() => {
            currentStep++;
            const percent = Math.min(100, Math.floor((currentStep / steps) * 100));
            this.setState({ percent });

            if (percent >= 100) {
                clearInterval(this.timer);
                if (this.props.onComplete) this.props.onComplete();
            }
        }, stepTime);
    }

    componentWillUnmount() {
        if (this.timer) clearInterval(this.timer);
    }

    render() {
        const { percent } = this.state;
        return (
            <div className="loading-overlay">
                <div className="loading-container">
                    <div className="loading-bar">
                        <div
                            className="loading-fill"
                            style={{ width: `${percent}%`, background: `linear-gradient(to right, #4caf50, #8bc34a)` }}
                        ></div>
                    </div>
                    <div className="loading-text">{percent}%</div>
                    <div className="loading-subtext">{this.props.message || "正在啟動 ROS..."}</div>
                </div>
            </div>
        );
    }
}

export default LoadingScreen;
