import { Component, createRef } from "react";

class Gauge extends Component {
    canvasRef = createRef();

    componentDidMount() { this.draw(); }
    componentDidUpdate() { this.draw(); }

    draw() {
        const canvas = this.canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        const width = canvas.width;
        const height = canvas.height;

        const centerX = width / 2;
        const centerY = height * 0.92;
        const radius = Math.min(width, height) * 0.42;

        const { value = 0, max = 1, label = "", unit = "" } = this.props;

        // 將速度轉換為 0~100% 的比例，左到右填充
        let percent = (Math.abs(value) / max) * 100;
        percent = Math.max(0, Math.min(percent, 100)); // clamp 0~100

        // === 顏色根據百分比 ===
        let color = "#444";
        if (percent > 0) {
            color = "#5900ffff";
            if (percent > 10 && percent <= 40) color = "#00ff9f";
            else if (percent > 40 && percent <= 55) color = "#e5fe00ff";
            else if (percent > 55 && percent <= 65) color = "#ff6600";
            else if (percent > 65 && percent <= 75) color = "#ff2200fb";
            else if (percent > 75) color = "#ff00cc";
        }

        ctx.clearRect(0, 0, width, height);

        // === 背景半圓 ===
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
        ctx.lineWidth = 12;
        ctx.strokeStyle = "#444";
        ctx.stroke();

        // === 依照百分比繪製填充弧 ===
        const startAngle = Math.PI;
        const endAngle = Math.PI + (percent / 100) * Math.PI;

        if (percent > 0) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.lineWidth = 12;
            ctx.strokeStyle = color;
            ctx.stroke();
        }

        // === 顯示速度值 ===
        ctx.fillStyle = "#e0e7ff";
        ctx.font = "18px Arial";
        ctx.textAlign = "center";
        ctx.fillText(percent.toFixed(1), centerX, centerY - radius * 0.01);

        // 標籤
        ctx.font = "13px Arial";
        ctx.fillStyle = "#aaa";
        ctx.fillText(`${label} (${unit})`, centerX, centerY - radius * 1.55);
    }

    render() {
        const { width = 90, height = 80 } = this.props;
        return <canvas ref={this.canvasRef} width={width} height={height} />;
    }
}

export default Gauge;

