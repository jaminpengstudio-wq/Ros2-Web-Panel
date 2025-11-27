import { Component, createRef } from "react";

class Gauge extends Component {
    canvasRef = createRef();

    componentDidMount() {
        this.draw();
    }

    componentDidUpdate() {
        this.draw();
    }

    draw() {
        const canvas = this.canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2 - 8;  // 繪圖往上偏移下面才有空間留給文字
        const radius = Math.min(width, height) * 0.32;  // 調整圓圈大小

        const { value = 0, min = -1, max = 1, label = "", unit = "", linearValue = 0 } = this.props;
        const clamped = Math.min(Math.max(value, min), max);
        const percent = Math.abs((clamped / max) * 100);  // 百分比顯示
        const zeroAngle = -Math.PI / 2;

        // 🟢 顏色邏輯：依照百分比區間改變顏色
        let color = "#5900ffff";
        if (percent > 10 && percent <= 40) color = "#00ff9f";
        else if (percent > 40 && percent <= 55) color = "#e5fe00ff";
        else if (percent > 55 && percent <= 65) color = "#ff6600";
        else if (percent > 65 && percent <= 75) color = "#ff2200fb";
        else if (percent > 75) color = "#ff00cc";


        // 清空畫布
        ctx.clearRect(0, 0, width, height);

        // 背景圓環
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.lineWidth = 22; // 線更粗
        ctx.strokeStyle = "#333";
        ctx.stroke();

        // 線速度仍為左右對稱顯示，
        // 角速度則固定右轉在右半圈、左轉在左半圈（不受線速度影響）
        let startAngle = zeroAngle;
        let endAngle = zeroAngle;
        const isAngular = label.toLowerCase().includes("angular");

        if (isAngular) {
            // 倒車時角速度左右反轉
            const linearDir = linearValue || 0;

            if (linearDir >= 0) {
                // 前進
                if (clamped > 0) {
                    // 左轉 → 左半圈
                    startAngle = zeroAngle;
                    endAngle = zeroAngle - (Math.abs(clamped) / max) * Math.PI;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius, endAngle, startAngle, false);
                } else if (clamped < 0) {
                    // 右轉 → 右半圈
                    startAngle = zeroAngle;
                    endAngle = zeroAngle + (Math.abs(clamped) / Math.abs(min)) * Math.PI;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius, startAngle, endAngle, false);
                } else {
                    ctx.beginPath();
                }
            } else {
                // 倒退 → 反向顯示
                if (clamped > 0) {
                    startAngle = zeroAngle;
                    endAngle = zeroAngle + (Math.abs(clamped) / max) * Math.PI;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius, startAngle, endAngle, false);
                } else if (clamped < 0) {
                    startAngle = zeroAngle;
                    endAngle = zeroAngle - (Math.abs(clamped) / Math.abs(min)) * Math.PI;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius, endAngle, startAngle, false);
                } else {
                    ctx.beginPath();
                }
            }
        } else {
            // 線速度對稱
            if (clamped >= 0) {
                startAngle = zeroAngle;
                endAngle = zeroAngle + (Math.abs(clamped) / max) * Math.PI;
            } else {
                startAngle = zeroAngle - (Math.abs(clamped) / Math.abs(min)) * Math.PI;
                endAngle = zeroAngle;
            }
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 22;
        // ctx.lineCap = "round";  顯示的bar會有圓角
        ctx.stroke();

        // 中央顯示絕對值
        ctx.fillStyle = "#e0e7ff";
        ctx.font = "23px Arial";
        ctx.textAlign = "center";
        ctx.fillText(percent.toFixed(1), centerX, centerY + 8);

        // 標籤
        ctx.font = "14px Arial";
        ctx.fillStyle = "#aaa";
        ctx.fillText(`${label} (${unit})`, centerX, centerY + radius + 33);

        // 左右箭頭（角速度特別用）
        if (isAngular) {
            ctx.font = "18px Arial";
            ctx.fillStyle = "#999";
            ctx.fillText("←", centerX - radius - 22, centerY + 8);
            ctx.fillText("→", centerX + radius + 22, centerY + 8);
        }
    }

    render() {
        const { width = 160, height = 160 } = this.props;
        return <canvas ref={this.canvasRef} width={width} height={height} />;
    }
}

export default Gauge;
