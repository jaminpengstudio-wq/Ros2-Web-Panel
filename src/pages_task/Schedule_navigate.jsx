import { useState } from "react";

const ScheduleNavigate = ({ addToast, waypoints, onCreate, }) => {

    const [target, setTarget] = useState("");
    const [onFail, setOnFail] = useState("skip");
    const [retryCount, setRetryCount] = useState(2);

    const handleAdd = () => {
        if (!target) {
            addToast("請選擇地點", "warning")
            return;
        }

        if (retryCount < 0 || retryCount > 2) {
            addToast("嘗試次數必須介於 0~2", "warning");
            return;
        }

        onCreate({
            type: "navigate",
            target,             // waypoint id
            on_fail: onFail,    // abort / skip
            retry_count: retryCount
        });

        // reset
        setTarget("");
        setOnFail("skip");
        setRetryCount(2);
    };

    return (
        <div className="schedule-mode-box">
            <div className="form-group">
                <label>目標地點</label>
                <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                >
                    <option value="">請選擇地點</option>
                    {waypoints.map((wp) => (
                        <option key={wp.id} value={wp.id}>
                            {wp.name}
                        </option>
                    ))}
                </select>
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

            <div className="navigate-add-btn-box" onClick={handleAdd}>
                <span className="navigate-add-btn">新增導航任務</span>
            </div>

        </div>
    );
};

export default ScheduleNavigate;
