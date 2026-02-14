const API_BASE = "https://ros_bot1_server.jampenglab.tw/bot1/api/v1";

const waypointApi = {
    // 啟動 waypoint 編輯用的地圖
    startMap: async (mapName) => {
        if (!mapName) {
            throw new Error("缺少地圖名稱");
        }

        const res = await fetch(`${API_BASE}/task/waypoint/start_map`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ mapName }),
        });

        const data = await res.json();
        if (!res.ok || data.success === false) {
            throw new Error(data.message);
        }

        return data;
    },

    // 停止 waypoint 編輯的地圖
    stopMap: async () => {
        const res = await fetch(`${API_BASE}/task/waypoint/stop_map`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });

        const data = await res.json();
        if (!res.ok || data.success === false) {
            throw new Error(data.message);
        }

        return data;
    },

    // 儲存新建立的座標地點文件
    saveWaypoints: async (mapName, fileName, yamlData) => {
        if (!mapName || !fileName || !yamlData) {
            throw new Error("地圖名稱、文件名稱、座標地點資料，都是必填");
        }

        const res = await fetch(`${API_BASE}/task/waypoint/save`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                mapName,
                fileName,
                data: yamlData
            }),
        });

        const data = await res.json();
        if (!res.ok || data.success === false) {
            throw new Error(data.message || "儲存失敗");
        }

        return data;
    },

    // 取得使用該地圖建立的所有座標地點文件名稱
    getWaypointList: async (mapName) => {
        if (!mapName) {
            throw new Error("缺少地圖名稱");
        }

        const res = await fetch(`${API_BASE}/task/waypoint/list`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ mapName }),
        });

        const data = await res.json();
        if (!res.ok || data.success === false) {
            throw new Error(data.message || "取得列表失敗");
        }

        return data;
    },

    // 取得指定文件的所有地點名稱和座標資訊
    getWaypointFile: async (mapName, fileName) => {
        if (!mapName || !fileName) {
            throw new Error("缺少地圖名稱或文件名稱");
        }

        const res = await fetch(`${API_BASE}/task/waypoint/get_file`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mapName, fileName }),
        });

        const data = await res.json();
        if (!res.ok || data.success === false) {
            throw new Error(data.message || "取得文件失敗");
        }

        return data;
    },

    // 儲存修改後的座標地點文件
    saveEditWaypoints: async (mapName, fileName, yamlData) => {
        if (!mapName || !fileName || !yamlData) {
            throw new Error("地圖名稱、文件名稱、座標地點資料，都是必填");
        }

        // const res = await fetch(`${API_BASE}/task/edit_waypoint/save`, {
        //     method: "POST",
        //     headers: {
        //         "Content-Type": "application/json",
        //     },
        //     body: JSON.stringify({
        //         mapName,
        //         fileName,
        //         data: yamlData
        //     }),
        // });
        const res = await fetch(`${API_BASE}/task/edit_waypoint/save/${encodeURIComponent(fileName)}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                mapName,
                data: yamlData
            }),
        });

        const data = await res.json();
        if (!res.ok || data.success === false) {
            throw new Error(data.message || "儲存失敗");
        }

        return data;
    },

    // 刪除指定的 waypoint 文件
    deleteWaypointFile: async (fileName) => {
        if (!fileName) {
            throw new Error("缺少文件名稱");
        }

        // const res = await fetch(`${API_BASE}/task/waypoint/delete`, {
        //     method: "POST",
        //     headers: {
        //         "Content-Type": "application/json",
        //     },
        //     body: JSON.stringify({ fileName }),
        // });

        const res = await fetch(`${API_BASE}/task/waypoint/delete/${encodeURIComponent(fileName)}`, {
            method: "DELETE",
        });

        const data = await res.json();

        if (!res.ok || data.success === false) {
            throw new Error(data.message || "刪除失敗");
        }

        return data;
    },

};

export default waypointApi;
