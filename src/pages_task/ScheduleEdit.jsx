// import { useState } from "react";
// import scheduleApi from "../scripts/scheduleApi";

const ScheduleEdit = ({ onClose, addToast }) => {

    const handleClose = () => {
        onClose?.();
    };

    return (
        <div className="schedule-edit">

            <span>任務排程 - 修改面板</span>

            <button
                className="btn close"
                onClick={handleClose}
            >
                關閉
            </button>
        </div>
    );
};

export default ScheduleEdit;
