import { useState } from "react";

const ScheduleAdd = ({
    onClose, addToast,
    taskTypeOptions, setCreateTaskMode, onSubmitAllSchedules
}) => {

    const [showSaveOverlay, setShowSaveOverlay] = useState(false);
    const [yamlFileName, setYamlFileName] = useState("");

    const handleClose = () => {
        onClose?.();
    };

    const handleSelectTask = (taskKey) => {
        setCreateTaskMode?.(taskKey);

        // const task = taskTypeOptions.find(t => t.key === taskKey);
        // addToast?.(`已選擇任務類型：${task?.label}`, "success");
    };

    // 點擊「儲存排程」 → 開 overlay
    const handleOpenSaveOverlay = () => {
        setShowSaveOverlay(true);
    };

    // 取消儲存
    const handleCancelSave = () => {
        setShowSaveOverlay(false);
        setYamlFileName("");
    };

    // 確定送出
    const handleConfirmSave = () => {

        if (!yamlFileName.trim()) {
            addToast?.("請輸入文件名稱", "warning");
            return;
        }

        // 呼叫父層 API
        onSubmitAllSchedules?.(yamlFileName.trim());

        setShowSaveOverlay(false);
        setYamlFileName("");
    };

    return (
        <div className="schedule-add">
            <div className="schedule-add-options">

                {/* 第一個按鈕為固定關閉這個面板 */}
                <div
                    className="schedule-close-option"
                    onClick={handleClose}
                >
                    取消排程
                </div>
                <div
                    className="schedule-save"
                    onClick={handleOpenSaveOverlay}
                >
                    儲存排程
                </div>

                {/* 自動生成任務按鈕 */}
                {taskTypeOptions.map(task => (
                    <div
                        key={task.key}
                        className="schedule-option"
                        onClick={() => handleSelectTask(task.key)}
                    >
                        {task.label}
                    </div>
                ))}

            </div>

            {/* 覆蓋層 */}
            {showSaveOverlay && (
                <div className="schedule-save-overlay">

                    <div className="schedule-save-panel">

                        <div className="save-title">
                            請輸入任務檔案名稱
                        </div>

                        <input
                            className="schedule-save-input"
                            type="text"
                            value={yamlFileName}
                            onChange={(e) => setYamlFileName(e.target.value)}
                            placeholder="請輸入任務名稱"
                        />

                        <div className="save-actions">
                            <div
                                className="btn-confirm"
                                onClick={handleConfirmSave}
                            >
                                <span>確定儲存</span>
                            </div>

                            <div
                                className="btn-cancel"
                                onClick={handleCancelSave}
                            >
                                <span>取消</span>
                            </div>
                        </div>

                    </div>

                </div>
            )}

        </div>
    );
};

export default ScheduleAdd;
