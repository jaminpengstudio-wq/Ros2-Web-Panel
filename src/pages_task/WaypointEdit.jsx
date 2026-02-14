import { useState } from "react";
import waypointApi from "../scripts/waypointApi";
import mqttService from "../scripts/MqttService";
import Config from "../scripts/config";

const EDIT_SESSION_KEY = "waypoint_edit_data";

const YAW_OPTIONS = [
    { label: "右 (East, 0°)", value: 0 },
    { label: "上 (North, 90°)", value: Math.PI / 2 },
    { label: "左 (West, 180°)", value: -Math.PI },
    { label: "下 (South, -90°)", value: -Math.PI / 2 },

    { label: "右上 (NE, 45°)", value: Math.PI / 4 },
    { label: "左上 (NW, 135°)", value: 3 * Math.PI / 4 },
    { label: "左下 (SW, -135°)", value: -3 * Math.PI / 4 },
    { label: "右下 (SE, -45°)", value: -Math.PI / 4 },
];

const WaypointEdit = ({
    mapName, onClose, addToast, waypointFiles,
    selectedPose, confirmedWaypoints,
    onConfirmWaypoint, setConfirmedWaypoints, clearWaypointState,
    refreshWaypointList,
}) => {

    const [editingFile, setEditingFile] = useState(null);

    // 新增用 state（仿 WaypointAdd）
    const [pointName, setPointName] = useState("");
    const [yaw, setYaw] = useState(0);
    const [loading, setLoading] = useState(false);


    // 用誤差範圍比對取回的 yaw 方位
    const findYawLabel = (yawValue) => {
        const epsilon = 0.01; // 誤差容忍範圍
        const match = YAW_OPTIONS.find(
            o => Math.abs(o.value - yawValue) < epsilon
        );
        return match ? match.label : `自訂角度 (${yawValue.toFixed(2)})`;
    };

    // 停止 waypoint 編輯的地圖
    const handleCancel = async () => {
        try {

            const result = await waypointApi.stopMap();

            addToast?.(result.message, "success");

            // 清除-取得所有文件名稱 waypoint files session
            sessionStorage.removeItem("waypoint_files");
            // 清除-取得指定文件的所有內容 session
            sessionStorage.removeItem(EDIT_SESSION_KEY);

            clearWaypointState?.(); // 清空(task 父層) 所有座標點
            onClose();
        } catch (err) {
            addToast?.(err.message, "error");
        }
    };

    // 只關閉第二層面板
    const handleCloseOverlay = () => {
        setEditingFile(null);
        setPointName("");
        clearWaypointState?.(); // 清空(task 父層) 所有座標點
    };

    // 取得指定文件的所有地點座標內容
    const handleEdit = async (fileName) => {
        try {
            const result = await waypointApi.getWaypointFile(mapName, fileName);

            const wpList = (result.waypoints || []).map(wp => ({
                name: wp.name,
                x: wp.pose.x,
                y: wp.pose.y,
                yaw: wp.pose.yaw
            }));

            // 用來判斷是否開啟編輯的區塊用
            setEditingFile(fileName);

            // 寫入父層 state
            setConfirmedWaypoints?.(wpList);

            sessionStorage.setItem(
                EDIT_SESSION_KEY,
                JSON.stringify({
                    fileName,
                    waypoints: wpList
                })
            );

            addToast(result.message, "success");
        } catch (err) {
            addToast?.(err.message, "error");
        }
    };

    // 刪除單一地點座標 waypoint (不需要呼叫 API)
    const handleDeleteWaypoint = (index) => {
        const updated = confirmedWaypoints.filter((_, i) => i !== index);
        setConfirmedWaypoints?.(updated);

        sessionStorage.setItem(
            EDIT_SESSION_KEY,
            JSON.stringify({
                fileName: editingFile,
                waypoints: updated
            })
        );
    };

    // 確定加入 (與 WaypointAdd 相同)
    const handleConfirm = () => {
        if (!selectedPose || !pointName) {
            addToast("請先選擇座標並輸入名稱", "warning");
            return;
        }

        const payload = {
            frame_id: "map",
            stamp: Date.now() / 1000, // seconds
            name: pointName,
            pose: {
                x: selectedPose.x,
                y: selectedPose.y,
                yaw: yaw,
            },
            source: "web",
        };

        try {

            mqttService.publish(
                Config.DEBUG_WAYPOINT_GREEN_MARK_TOPIC,
                payload
            );

            // 通知 Task 保留 waypoint
            onConfirmWaypoint?.({
                name: pointName,
                x: selectedPose.x,
                y: selectedPose.y,
                yaw: yaw,
            });


            const newWaypoint = {
                name: pointName,
                x: selectedPose.x,
                y: selectedPose.y,
                yaw: yaw
            };

            setConfirmedWaypoints?.([
                ...confirmedWaypoints,
                newWaypoint
            ]);

            setPointName("");
            addToast("已加入座標", "success");
        } catch (err) {
            addToast(err.message, "error");
        }

    };

    // 儲存修改後的文件
    const handleSaveWaypoints = async () => {
        if (!editingFile) {
            addToast("沒有正在編輯的文件", "warning");
            return;
        }

        if (!confirmedWaypoints.length) {
            addToast("目前沒有任何座標可儲存", "warning");
            return;
        }

        try {
            setLoading(true);

            // 構建 YAML 所需資料（與 WaypointAdd 相同格式）
            const yamlData = {
                frame_id: "map",
                map_name: mapName,
                waypoints: confirmedWaypoints.map((wp, idx) => ({
                    id: `wp_${String(idx + 1).padStart(3, "0")}`,
                    name: wp.name,
                    pose: {
                        x: Number(wp.x.toFixed(3)),
                        y: Number(wp.y.toFixed(3)),
                        yaw: Number(wp.yaw.toFixed(3))
                    }
                }))
            };

            const result = await waypointApi.saveEditWaypoints(
                mapName,
                editingFile,   // 編輯的文件名稱
                yamlData
            );

            addToast(result.message, "success");


            // 停止 ROS waypoint 編輯的地圖
            await handleCancel();

        } catch (err) {
            addToast(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    // 刪除指定文件
    const handleDelete = async (fileName) => {
        try {
            const result = await waypointApi.deleteWaypointFile(fileName);

            // 停止 ROS waypoint 編輯的地圖
            await handleCancel();

            // 新增-[地點座標] 時重新呼叫API取得新的數據
            await refreshWaypointList?.();

            addToast(result.message, "success");
        } catch (err) {
            addToast?.(err.message, "error");
        }
    };

    return (
        <div className="waypoint-edit-container">

            {/* Header */}
            <div className="waypoint-edit-header">
                <span className="waypoint-edit-label">修改文件</span>

                <div className="waypoint-edit-close-btn" onClick={handleCancel}>
                    關閉
                </div>
            </div>

            {/* 檔案列表 */}
            {!editingFile && (
                <div className="waypoint-file-list">
                    {waypointFiles.length === 0 && (
                        <div className="waypoint-edit-empty">
                            目前沒有建立任何座標文件
                        </div>
                    )}

                    {waypointFiles.map((file) => (
                        <div key={file} className="file-row">
                            <span className="file-name">{file}</span>

                            <div className="file-btn-box">
                                <div
                                    className="edit-btn"
                                    onClick={() => handleEdit(file)}
                                >
                                    編輯
                                </div>
                                <div
                                    className="delete-btn"
                                    onClick={() => handleDelete(file)}
                                >
                                    刪除
                                </div>
                            </div>

                        </div>
                    ))}
                </div>
            )}


            {/* 第二層覆蓋式編輯面板 */}
            {editingFile && (
                <div className="edit-overlay-panel">

                    {/* ===== 上半部（完全複製 WaypointAdd 樣式） ===== */}
                    <div className="waypoint-add-top">
                        <div className="pose-preview">
                            <span className="coordinate-title">選取座標</span>
                            {selectedPose ? (
                                <div className="pose-text">
                                    <div>x 軸：{selectedPose.x}</div>
                                    <div>y 軸：{selectedPose.y}</div>
                                    <div>
                                        yaw 方向：
                                        {YAW_OPTIONS.find(o => o.value === yaw)?.label}
                                    </div>
                                </div>
                            ) : (
                                <div className="hint">
                                    <span>請點地圖選擇地點</span>
                                </div>
                            )}
                        </div>

                        <div className="pose-input">
                            <input
                                className="pose-input-box"
                                value={pointName}
                                onChange={e => setPointName(e.target.value)}
                                placeholder="地點名稱"
                            />

                            <div className="yaw-select">
                                <div className="yaw-title">
                                    機器到達座標後的朝向
                                </div>

                                <select
                                    value={yaw}
                                    onChange={e => setYaw(Number(e.target.value))}
                                >
                                    {YAW_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="btn-row">
                                <div
                                    className="add-point-btn"
                                    onClick={handleConfirm}
                                >
                                    確定加入
                                </div>

                                <div
                                    className="cancel-point-btn"
                                    onClick={handleCloseOverlay}
                                >
                                    取消
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ===== 下半部：Waypoint 列表 ===== */}
                    <div className="edit-bottom">
                        {confirmedWaypoints.length === 0 ? (
                            <div className="hint">
                                此文件目前沒有任何座標
                            </div>
                        ) : (
                            <>
                                <div className="result-header">
                                    <span className="coordinate-title">已加入的座標</span>

                                    <div
                                        className={`save-btn ${loading ? "disabled" : ""} edit-save-btn`}
                                        onClick={loading ? undefined : handleSaveWaypoints}
                                    >
                                        <span>
                                            {loading ? "儲存中..." : "儲存座標地點"}
                                        </span>
                                    </div>
                                </div>
                                <ul className="waypoint-result-list edit-waypoint-result-list">
                                    {confirmedWaypoints.map((wp, idx) => (
                                        <li key={idx} className="waypoint-item">
                                            <div>
                                                <strong className="wp-name">
                                                    {wp.name}
                                                </strong>

                                                <div className="wp-values">
                                                    <span>x: {wp.x}</span>
                                                    <span>y: {wp.y}</span>
                                                    <span>
                                                        朝向: {findYawLabel(wp.yaw)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div
                                                className="delete-point-btn"
                                                onClick={() => handleDeleteWaypoint(idx)}
                                            >
                                                刪除
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </>

                        )}
                    </div>

                </div>
            )}

        </div>
    );
};

export default WaypointEdit;
