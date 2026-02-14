import { useState } from "react";

const ScheduleRotate = ({ addToast, onCreate }) => {

    const [direction, setDirection] = useState("left");
    const [angle, setAngle] = useState(90);
    const [onFail, setOnFail] = useState("skip");
    const [retryCount, setRetryCount] = useState(1);

    const handleAdd = () => {
        const numAngle = Number(angle);
        const numRetry = Number(retryCount);

        // 檢查角度
        if (isNaN(numAngle) || numAngle <= 0 || numAngle > 360) {
            addToast("旋轉角度必須大於 0 且小於等於 360", "warning");
            return;
        }

        // 檢查 retryCount
        if (isNaN(numRetry) || numRetry < 0 || numRetry > 2) {
            addToast("重新嘗試次數必須介於 0 到 2", "warning");
            return;
        }

        onCreate({
            type: "rotate",
            direction,
            angle_deg: parseFloat(numAngle),
            on_fail: onFail,
            retry_count: retryCount
        });

        // reset
        setDirection("left");
        setAngle(90);
        setOnFail("skip");
        setRetryCount(1);
    };

    return (
        <div className="schedule-mode-box">
            <div className="form-group">
                <label>旋轉方向</label>
                <select
                    value={direction}
                    onChange={(e) => setDirection(e.target.value)}
                >
                    <option value="left">向左</option>
                    <option value="right">向右</option>
                </select>
            </div>

            <div className="form-group">
                <label>旋轉角度 (deg)</label>
                <input
                    type="number"
                    min="1"
                    max="360"
                    value={angle}
                    onChange={(e) => setAngle(e.target.value)}
                />
            </div>

            <div className="form-group">
                <label>失敗時處理方式</label>
                <select
                    value={onFail}
                    onChange={(e) => setOnFail(e.target.value)}
                >
                    <option value="skip">略過</option>
                    <option value="abort">中止</option>
                </select>
            </div>

            <div className="form-group">
                <label>重新嘗試次數</label>
                <input
                    type="number"
                    min="0"
                    max="2"
                    value={retryCount}
                    onChange={(e) => setRetryCount(Number(e.target.value))}
                />
            </div>

            <div className="rotate-add-btn-box" onClick={handleAdd}>
                <span className="rotate-add-btn">新增旋轉任務</span>
            </div>
        </div>
    );
};

export default ScheduleRotate;
