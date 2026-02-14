import { useState } from "react";

const ScheduleCaptureImage = ({ addToast, onCreate }) => {

    const [camera, setCamera] = useState("front");
    const [mode, setMode] = useState("front");
    const [count, setCount] = useState(1);
    const [onFail, setOnFail] = useState("skip");
    const [retryCount, setRetryCount] = useState(1);

    const handleAdd = () => {
        const numCount = Number(count);
        const numRetry = Number(retryCount);

        // 拍攝張數檢查
        if (isNaN(numCount) || numCount <= 0) {
            addToast("拍攝張數必須大於 0", "warning");
            return;
        }

        // retryCount 檢查
        if (isNaN(numRetry) || numRetry < 0 || numRetry > 2) {
            addToast("重新嘗試次數必須介於 0 到 2", "warning");
            return;
        }

        onCreate({
            type: "capture_image",
            camera,
            mode,
            count: Number(count),
            on_fail: onFail,
            retry_count: retryCount
        });

        // reset
        setCamera("front");
        setMode("front");
        setCount(1);
        setOnFail("skip");
        setRetryCount(1);
    };

    return (
        <div className="schedule-mode-box">
            <div className="form-group">
                <label>使用那一個位置的鏡頭</label>
                <input
                    type="text"
                    value={camera}
                    onChange={(e) => setCamera(e.target.value)}
                />
            </div>

            <div className="form-group">
                <label>拍攝模式</label>
                <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                >
                    <option value="front">前方</option>
                    <option value="surround">環繞</option>
                </select>
            </div>

            <div className="form-group">
                <label>每個方向拍攝張數</label>
                <input
                    type="number"
                    min="1"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
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

            <div className="capture-add-btn-box" onClick={handleAdd}>
                <span className="capture-add-btn">新增拍照任務</span>
            </div>
        </div>
    );
};

export default ScheduleCaptureImage;
