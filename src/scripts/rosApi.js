const API_BASE = "https://ros_bot1_server.jampenglab.tw/bot1/api/v1";

// 取得 ROS 狀態
export const getStatus = async () => {
    const url = `${API_BASE}/ros/status`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("讀取 ROS 狀態失敗");
        return await response.json();
    } catch (err) {
        return { running: false, mode: "idle", mapName: null };
    }
};

// 啟動建圖或導航模式
export const startMode = async (mode, mapName = null) => {
    const url = `${API_BASE}/ros/start_mode`;
    try {
        const payload = { mode };

        // 只有導航模式才加入 mapName
        if (mapName) {
            payload.mapName = mapName;
        }

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "伺服器回應失敗");
        }

        return await response.text();
    } catch (err) {
        throw err;
    }
};

// 停止 ROS 運作
export const stopMode = async () => {
    const url = `${API_BASE}/ros/stop_mode`;
    try {
        const response = await fetch(url, {
            method: "POST",
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "伺服器回應失敗");
        }

        return await response.text();
    } catch (err) {
        throw err;
    }
};

// 取得所有地圖名稱列表
export const getMaps = async () => {
    const url = `${API_BASE}/maps/list_maps`;
    try {
        const response = await fetch(url, {
            method: "GET",
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "伺服器回應失敗");
        }

        return await response.json();
    } catch (err) {
        throw err;
    }
};

// 儲存地圖
export const saveMap = async (folderName) => {
    const url = `${API_BASE}/maps/save_map`;
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folderName })
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "伺服器回應失敗");
        }

        return await response.text();
    } catch (err) {
        throw err;
    }
};

// ============================================
// 啟動 ROS 鏡頭 Gstreamer pipeline Launch File
export const startCameraGstreamer = async () => {
    const url = `${API_BASE}/ros/gstreamer/start`;
    const response = await fetch(url, {
        method: "POST",
    });
    if (!response.ok) throw new Error("啟動 Camera 失敗");
    return await response.text();
};

// 停止  ROS 鏡頭 Gstreamer pipeline Launch File
export const stopCameraGstreamer = async () => {
    const url = `${API_BASE}/ros/gstreamer/stop`;
    const response = await fetch(url, {
        method: "POST",
    });
    if (!response.ok) throw new Error("停止 Camera 失敗");
    return await response.text();
};

const rosApi = {
    getStatus, startMode, stopMode, getMaps, saveMap, startCameraGstreamer, stopCameraGstreamer
};
export default rosApi;
