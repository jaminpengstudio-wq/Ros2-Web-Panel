import { Component, createRef } from "react";

class Gauge extends Component {
    canvasRef = createRef();
    lastWidth = 0;
    lastHeight = 0;
    rafId = null;

    componentDidMount() {
        this.resizeAndDraw();
        window.addEventListener("resize", this.resizeAndDraw);
    }

    componentDidUpdate() {
        // this.draw();
        this.resizeAndDraw();
    }

    componentWillUnmount() {
        window.removeEventListener("resize", this.resizeAndDraw);
        if (this.rafId) cancelAnimationFrame(this.rafId);
    }

    resizeAndDraw = () => {
        // 用 rAF 避免 resize storm
        if (this.rafId) return;

        this.rafId = requestAnimationFrame(() => {
            this.rafId = null;
            this.resizeCanvas();
            this.draw();
        });
    };

    resizeCanvas() {
        const canvas = this.canvasRef.current;
        if (!canvas) return;

        const parent = canvas.parentElement;
        if (!parent) return;

        const width = parent.clientWidth;
        const height = parent.clientHeight;

        if (width === 0 || height === 0) return;

        // 只有尺寸真的變才改，避免 loop
        if (width === this.lastWidth && height === this.lastHeight) return;

        this.lastWidth = width;
        this.lastHeight = height;

        canvas.width = width;
        canvas.height = height;
    }

    draw() {
        const canvas = this.canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        const width = canvas.width;
        const height = canvas.height;

        if (width === 0 || height === 0) return;

        ctx.clearRect(0, 0, width, height);

        const radius = Math.min(width, height) * 0.42;

        const lineWidth = radius * 0.12;
        const valueFont = radius * 0.22;
        const labelFont = radius * 0.14;

        const centerX = width / 2;
        // const centerY = height * 0.7;
        // 視覺置中半圓
        const paddingBottom = radius * 0.15; // 留一點呼吸空間
        const centerY = height - paddingBottom;

        const { value = 0, max = 1, label = "", unit = "" } = this.props;

        let percent = (Math.abs(value) / max) * 100;
        percent = Math.max(0, Math.min(percent, 100));

        let color = "#444";
        if (percent > 0) {
            if (percent <= 40) color = "#00ff9f";
            else if (percent <= 55) color = "#e5fe00";
            else if (percent <= 65) color = "#ff6600";
            else if (percent <= 75) color = "#ff2200";
            else color = "#ff00cc";
        }

        // 背景半圓
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, Math.PI, Math.PI * 2);
        ctx.lineWidth = lineWidth * 2;
        ctx.strokeStyle = "#444";
        // ctx.lineCap = "round";
        ctx.stroke();

        // 填充弧
        if (percent > 0) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, Math.PI, Math.PI + (percent / 100) * Math.PI);
            ctx.lineWidth = lineWidth * 2;
            ctx.strokeStyle = color;
            ctx.stroke();
        }

        // 數值
        ctx.fillStyle = "#e0e7ff";
        ctx.font = `${valueFont * 2.2}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(percent.toFixed(1), centerX, centerY - radius * 0.15);

        // 標籤
        ctx.fillStyle = "#aaa";
        ctx.font = `${labelFont * 2.4}px Arial`;
        ctx.fillText(`${label} (${unit})`, centerX, centerY - radius * 1.5);
    }

    render() {
        return (
            <div className="gauge-wrapper">
                <canvas
                    ref={this.canvasRef}
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "block"
                    }}
                />
            </div>
        );
    }
}

export default Gauge;
