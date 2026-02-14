import { useState } from "react";

const ScheduleScanQr = ({ addToast, onCreate }) => {

    const [timeout, setTimeout] = useState(3.0);
    const [onFail, setOnFail] = useState("skip");
    const [retryCount, setRetryCount] = useState(1);

    const handleAdd = () => {
        const numTimeout = parseFloat(timeout);
        const numRetry = Number(retryCount);

        // timeout 檢查
        if (isNaN(numTimeout) || numTimeout <= 0 || numTimeout > 5) {
            addToast("掃描逾時時間必須大於 0 且不超過 5 秒", "warning");
            return;
        }

        // retryCount 檢查
        if (isNaN(numRetry) || numRetry < 0 || numRetry > 2) {
            addToast("重新嘗試次數必須介於 0 到 2", "warning");
            return;
        }

        onCreate({
            type: "scan_qr",
            timeout: parseFloat(numTimeout),
            on_fail: onFail,
            retry_count: retryCount
        });

        // reset
        setTimeout(3.0);
        setOnFail("skip");
        setRetryCount(1);
    };

    return (
        <div className="schedule-mode-box">
            <div className="form-group">
                <label>掃描逾時時間 (秒)</label>
                <input
                    type="number"
                    min="1"
                    max="5"
                    // step="0.1"
                    value={timeout}
                    onChange={(e) => setTimeout(e.target.value)}
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

            <div className="scan-add-btn-box" onClick={handleAdd}>
                <span className="scan-add-btn">新增 QR 掃描任務</span>
            </div>
        </div>
    );
};

export default ScheduleScanQr;
