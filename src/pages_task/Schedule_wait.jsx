import { useState } from "react";

const ScheduleWait = ({ addToast, onCreate }) => {

    const [duration, setDuration] = useState(3);

    const handleAdd = () => {
        const value = parseFloat(duration);

        if (isNaN(value) || value <= 0) {
            addToast("等待時間必須大於 0", "warning");
            return;
        }

        if (value > 10) {
            addToast("等待時間不能超過 10 秒", "warning");
            return;
        }

        onCreate({
            type: "wait",
            duration: parseFloat(value)
        });

        // reset
        setDuration(3);
    };

    return (
        <div className="schedule-mode-box">

            <div className="form-group">
                <label>等待時間 (秒)</label>
                <input
                    type="number"
                    min="1"
                    max="10"
                    // step="0.1"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                />
            </div>

            <div className="wait-add-btn-box" onClick={handleAdd}>
                <span className="wait-add-btn">新增等待任務</span>
            </div>

        </div>
    );
};

export default ScheduleWait;
