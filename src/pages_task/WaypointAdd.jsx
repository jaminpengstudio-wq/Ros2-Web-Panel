import { useState } from "react";
import waypointApi from "../scripts/waypointApi";
import mqttService from "../scripts/MqttService";
import Config from "../scripts/config";

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

const WaypointAdd = ({
    mapName, onClose, addToast, selectedPose,
    onConfirmWaypoint, confirmedWaypoints, clearWaypointState,
    refreshWaypointList,
}) => {
    const [pointName, setPointName] = useState("");
    const [loading, setLoading] = useState(false);
    const [yaw, setYaw] = useState(0);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [fileName, setFileName] = useState("");


    const handleConfirm = async () => {
        if (!selectedPose || !pointName) {
            addToast("請先在地圖上選擇座標並輸入名稱", "warning");
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
            setLoading(true);

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


            setPointName("");
            addToast("已確認座標地點", "success");
        } catch (err) {
            addToast(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    // 打開儲存文件視窗
    const openSaveModal = () => {
        if (!confirmedWaypoints.length) {
            addToast("沒有可儲存的座標", "warning");
            return;
        }
        setShowSaveModal(true);
    };

    // 儲存座標地點文件
    const handleConfirmSave = async () => {
        if (!fileName.trim()) {
            addToast("請輸入文件名稱", "warning");
            return;
        }

        // 檢查文件名稱是否合法
        const safePattern = /^[a-zA-Z0-9_-]+$/;
        if (!safePattern.test(fileName)) {
            addToast("檔名僅允許英數字、底線(_)與減號(-)", "warning");
            return;
        }

        try {
            setLoading(true);

            // 構建 YAML 所需資料
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

            const result = await waypointApi.saveWaypoints(mapName, fileName, yamlData);

            addToast(result.message, "success");

            // 新增-[地點座標] 時重新呼叫API取得新的數據
            await refreshWaypointList?.();

            setShowSaveModal(false);
            setFileName("");

            await handleCancel();   // 停止 ROS waypoint 編輯的地圖
        } catch (err) {
            addToast(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    // 停止 waypoint 編輯的地圖
    const handleCancel = async () => {
        try {
            setLoading(true);
            const result = await waypointApi.stopMap();

            addToast?.(result.message, "success");

            clearWaypointState?.(); // 清空(task 父層) 所有座標點
            onClose();
        } catch (err) {
            addToast?.(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="waypoint-add">
            {/* ===== 上半部：操作區 ===== */}
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

                {/* === 輸入區 === */}
                <div className="pose-input">
                    <input
                        className="pose-input-box"
                        value={pointName}
                        onChange={e => setPointName(e.target.value)}
                        placeholder="地點名稱"
                    />

                    {/* === yaw 選單 === */}
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
                        <div className="add-point-btn" onClick={handleConfirm} disabled={loading}>
                            {loading ? "新增中..." : "確定加入"}
                        </div>
                        <div className="cancel-point-btn" onClick={handleCancel} disabled={loading}>取消</div>
                    </div>
                </div>
            </div>

            {/* ===== 下半部：結果區 ===== */}
            <div className="waypoint-add-bottom">
                {confirmedWaypoints.length > 0 ? (
                    <>
                        <div className="result-header">
                            <span className="coordinate-title">已加入的座標</span>

                            <div className="save-btn" onClick={openSaveModal}>
                                <span>儲存座標地點</span>
                            </div>
                        </div>
                        <ul className="waypoint-result-list">
                            {confirmedWaypoints.map((wp, idx) => (
                                <li key={idx} className="waypoint-item">
                                    <strong className="wp-name">{wp.name}</strong>
                                    <div className="wp-values">
                                        <span>x: {wp.x.toFixed(2)}</span>
                                        <span>y: {wp.y.toFixed(2)}</span>
                                        <span>
                                            朝向: {YAW_OPTIONS.find(o => o.value === wp.yaw)?.label}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </>
                ) : (
                    <span className="hint">尚未新增任何座標</span>
                )}
            </div>


            {/* 儲存文件視窗 */}
            {showSaveModal && (
                <div className="save-modal-overlay">
                    <div className="save-modal">
                        <h3>建立座標文件</h3>

                        <input
                            value={fileName}
                            onChange={e => setFileName(e.target.value)}
                            placeholder="請輸入文件名稱"
                        />

                        <div className="modal-btn-row">
                            <div
                                className="modal-btn-row-save"
                                onClick={handleConfirmSave}
                            >
                                <span>確定儲存</span>
                            </div>
                            <div
                                className="modal-btn-row-cancel"
                                onClick={() => setShowSaveModal(false)}
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

export default WaypointAdd;
