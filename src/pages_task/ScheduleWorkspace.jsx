import ScheduleNavigate from "./Schedule_navigate";
import ScheduleWait from "./Schedule_wait";
import ScheduleRotate from "./Schedule_rotate";
import ScheduleCaptureImage from "./Schedule_capture_image";
import ScheduleScanQr from "./Schedule_scan_qr";

import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const ScheduleWorkspace = ({
    addToast, waypointData, createTaskMode, taskTypeOptions,
    allScheduleTasks, addScheduleTask, reorderScheduleTasks, deleteScheduleTask
}) => {

    const currentTaskLabel = taskTypeOptions?.find(t => t.key === createTaskMode)?.label;

    // 可拖曳任務元件
    const SortableItem = ({ id, children }) => {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
        } = useSortable({ id });

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
        };

        return (
            <div ref={setNodeRef} style={style}>
                {children({ attributes, listeners })}
            </div>
        );
    };

    // 加入拖曳結束處理
    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over) return;

        if (active.id !== over.id) {
            const oldIndex = parseInt(active.id);
            const newIndex = parseInt(over.id);
            reorderScheduleTasks(oldIndex, newIndex);
        }
    };

    // 根據 task.type 找中文名稱
    const getTaskLabel = (type) => {
        const found = taskTypeOptions?.find(t => t.key === type);
        return found ? found.label : type;
    };

    // 根據 waypoint id 找中文地點名稱
    const getWaypointName = (id) => {
        const found = waypointData?.waypoints?.find(wp => wp.id === id);
        return found ? found.name : id;
    };

    // 選擇任務類型的元件切換
    const renderCreateComponent = () => {

        if (!createTaskMode) {
            return <div className="workspace-no-mode">尚未任務類型</div>;
        }

        const commonProps = {
            addToast: addToast,
            waypoints: waypointData?.waypoints ?? [],
            mapName: waypointData?.map_name,
            frameId: waypointData?.frame_id,
            onCreate: addScheduleTask
        };

        switch (createTaskMode) {
            case "navigate":
                return <ScheduleNavigate {...commonProps} />;
            case "wait":
                return <ScheduleWait {...commonProps} />;
            case "rotate":
                return <ScheduleRotate {...commonProps} />;
            case "capture_image":
                return <ScheduleCaptureImage {...commonProps} />;
            case "scan_qr":
                return <ScheduleScanQr {...commonProps} />;
            default:
                return null;
        }
    };

    return (
        <div className="schedule-workspace">
            <div className="workspace-header">
                <span className="schedule-label">目前選擇的任務類型：</span>
                <span className="">{currentTaskLabel ?? "未選擇"}</span>
            </div>

            <>
                {/* 上半部 - 建立任務區 */}
                <div className="workspace-create">
                    {renderCreateComponent()}
                </div>

                {/* 下半部 - 任務列表 */}
                <div className="workspace-task-list">
                    <div className="task-list-title">任務列表</div>

                    {allScheduleTasks.length === 0 ? (
                        <div className="workspace-empty">
                            尚未新增任務
                        </div>
                    ) : (

                        <DndContext
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={allScheduleTasks.map((_, i) => i.toString())}
                                strategy={verticalListSortingStrategy}
                            >
                                {allScheduleTasks.map((task, index) => (
                                    <SortableItem key={index} id={index.toString()}>
                                        {({ attributes, listeners }) => (
                                            <div className="task-item">

                                                <div className="task-header">
                                                    {/* Header = 拖曳區 */}
                                                    <div className="task-header-left">
                                                        <div className="drag-handle"
                                                            {...attributes}
                                                            {...listeners}
                                                        // style={{ cursor: "grab" }}
                                                        >
                                                            <div className="dot"></div>
                                                            <div className="dot"></div>
                                                            <div className="dot"></div>
                                                            <div className="dot"></div>
                                                            <div className="dot"></div>
                                                            <div className="dot"></div>
                                                        </div>

                                                        <div>
                                                            {index + 1}. {getTaskLabel(task.type)}
                                                        </div>
                                                    </div>

                                                    <div
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteScheduleTask(index);
                                                        }}
                                                        className="task-delete-box"
                                                    >
                                                        <span className="task-delete-btn">刪除</span>
                                                    </div>
                                                </div>

                                                {/* 任務內容區 */}
                                                <div className="task-content">
                                                    {task.type === "navigate" && (
                                                        <div className="task-detail">
                                                            目標: {getWaypointName(task.target)} |
                                                            失敗處理: {task.on_fail === "skip" ? "略過" : "中止"} |
                                                            重新嘗試任務: {task.retry_count} 次
                                                        </div>
                                                    )}

                                                    {task.type === "wait" && (
                                                        <div className="task-detail">
                                                            等待時間: {Number(task.duration)} 秒
                                                        </div>
                                                    )}

                                                    {task.type === "rotate" && (
                                                        <div className="task-detail">
                                                            方向: {task.direction === "left" ? "向左" : "向右"} |
                                                            角度: {Number(task.angle_deg)} 度 |
                                                            失敗處理: {task.on_fail === "skip" ? "略過" : "中止"} |
                                                            重新嘗試任務: {task.retry_count} 次
                                                        </div>
                                                    )}

                                                    {task.type === "capture_image" && (
                                                        <div className="task-detail">
                                                            使用的鏡頭位置: {task.camera} |
                                                            模式: {task.mode === "front" ? "前方" : "環繞"} |
                                                            張數: {task.count} |
                                                            失敗處理: {task.on_fail === "skip" ? "略過" : "中止"} |
                                                            重新嘗試任務: {task.retry_count} 次
                                                        </div>
                                                    )}

                                                    {task.type === "scan_qr" && (
                                                        <div className="task-detail">
                                                            逾時時間: {Number(task.timeout)} 秒 |
                                                            失敗處理: {task.on_fail === "skip" ? "略過" : "中止"} |
                                                            重新嘗試任務: {task.retry_count} 次
                                                        </div>
                                                    )}
                                                </div>

                                            </div>
                                        )}
                                    </SortableItem>
                                ))}
                            </SortableContext>
                        </DndContext>

                    )}
                </div>
            </>

        </div>
    );
};

export default ScheduleWorkspace;
