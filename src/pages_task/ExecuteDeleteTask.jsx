
const ExecuteDeleteTask = ({
    activeFile, onClose, addToast,
    deleteMissionFile,
}) => {


    const handleClose = () => {
        onClose?.();
    };

    // 刪除指定任務排程的文件
    const confirmDeleteMission = async () => {

        if (activeFile === null) {
            addToast?.("請選擇要刪除的任務文件");
            return;
        }

        try {
            // 通知父層呼叫 API
            await deleteMissionFile?.(activeFile);

            handleClose();

        } catch (err) {
            addToast?.("執行失敗", "error");
        }
    }

    return (
        <div className="execute-delete-task">
            <div className="execute-delete-box">
                <div className="execute-delete-title">
                    <span>確定刪除：</span>
                    <div>{activeFile}</div>
                </div>

                <div className="execute-delete-btn-box">
                    <div
                        className="execute-delete-btn-confirm"
                        onClick={confirmDeleteMission}
                    >
                        確定
                    </div>

                    <div
                        className="execute-delete-btn-cancel"
                        onClick={handleClose}
                    >
                        取消
                    </div>
                </div>
            </div>

        </div>
    );
};

export default ExecuteDeleteTask;
