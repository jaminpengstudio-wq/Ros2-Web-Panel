import { Component, createRef } from "react";
import ROSLIB from "roslib";
import rosService from "../scripts/RosService";
import MapRenderer from "../scripts/MapRenderer";


class Map extends Component {
    constructor() {
        super();
        this.state = {
            connected: false,
            mapReady: false,
        };
        this.canvasRef = createRef();
        this.mapTopic = null;
        this.poseTopic = null;
        this.renderer = null;
        this.goalPublisher = null;
    }

    componentDidMount() {
        // 監聽連線狀態
        this.interval = setInterval(() => {
            const isConn = rosService.isConnected();
            if (isConn && !this.state.connected) {
                this.setState({ connected: true });
            } else if (!isConn && this.state.connected) {
                // 若斷線則重置狀態
                this.setState({ connected: false, mapReady: false });
            }
        }, 500);

    }

    // 等到畫布渲染完才建立 MapRenderer
    componentDidUpdate(prevProps, prevState) {
        if (this.state.connected && !this.renderer && this.canvasRef.current) {
            const ros = rosService.getRos();
            this.renderer = new MapRenderer(this.canvasRef.current);
            this.initRosConnections(ros);
        }
    }

    componentWillUnmount() {
        clearInterval(this.interval);

        if (this.mapTopic) this.mapTopic.unsubscribe();
        if (this.poseTopic) this.poseTopic.unsubscribe();
        if (this.renderer) this.renderer.destroy();
    }

    initRosConnections(ros) {
        // console.log("🗺️ Subscribing to /map and /amcl_pose ...");

        // map 訂閱
        this.mapTopic = new ROSLIB.Topic({
            ros,
            name: "/map",
            messageType: "nav_msgs/msg/OccupancyGrid",
        });

        this.mapTopic.subscribe((msg) => {
            if (!this.state.mapReady) this.setState({ mapReady: true });
            if (this.renderer) this.renderer.updateMap(msg);
        });

        // pose 訂閱
        this.poseTopic = new ROSLIB.Topic({
            ros,
            name: "/amcl_pose",
            messageType: "geometry_msgs/msg/PoseWithCovarianceStamped",
        });

        this.poseTopic.subscribe((msg) => {
            if (this.renderer) {
                this.renderer.updateRobotPose(msg); // 檢查 renderer
            } else {
                console.warn("Renderer not ready yet, skipping pose update");
            }
        });

        // 將導航的目標地和方位使用 topic 發送到 ROS 端的 action client
        this.goalPublisher = new ROSLIB.Topic({
            ros,
            name: "/web_goal_pose",
            messageType: "geometry_msgs/msg/PoseStamped",
        });

        // Advertise topic first to avoid "Cannot infer topic type" errors
        try {
            if (!this.goalPublisher.isAdvertised) {
                this.goalPublisher.advertise();
                this.goalPublisher.isAdvertised = true;
                // console.log("✅ Advertised /web_goal_pose (geometry_msgs/PoseStamped)");
            }
        } catch (e) {
            console.warn("⚠️ advertise /web_goal_pose failed (may already be advertised):", e);
        }

        // 設定目標回調
        if (this.renderer) {
            this.renderer.onGoalSelected = (goal) => {
                this.publishGoal(goal);

                // 如果父元件有 callback，通知 Home.jsx - 確認導航目標後要重新設定按鈕初始化
                if (this.props.onGoalSelected) this.props.onGoalSelected(goal);
            };
        }
    }

    publishGoal(goal) {
        if (!this.goalPublisher) {
            console.error("❌ goalPublisher not initialized");
            return;
        }
        if (!this.renderer || !this.renderer.latestMap) {
            // 仍可發送，但提醒沒有地圖資訊可能造成座標錯誤
            console.warn("⚠️ latestMap not available; ensure map/origin/resolution are correct on receiver side");
        }

        // 將 yaw 角轉成四元數
        const yawToQuaternion = (yaw) => {
            return {
                x: 0,
                y: 0,
                z: Math.sin(yaw / 2),
                w: Math.cos(yaw / 2),
            };
        };

        const rosYaw = -goal.yaw;;
        const q = yawToQuaternion(rosYaw);

        const nowMs = Date.now();
        const secs = Math.floor(nowMs / 1000);
        const nsecs = (nowMs % 1000) * 1e6;

        const msg = new ROSLIB.Message({
            header: {
                frame_id: "map",
                stamp: { secs: secs, nsecs: nsecs },
            },
            pose: {
                position: { x: goal.x, y: goal.y, z: 0 },
                orientation: q,
            },
        });

        try {
            this.goalPublisher.publish(msg);
            // console.log("📣 Published /web_goal_pose:", msg);
        } catch (err) {
            console.error("❌ publish failed:", err);
        }

        // console.log(
        //     `🎯 發送導航目標: (${goal.x.toFixed(2)}, ${goal.y.toFixed(2)}), 方向(Yaw): ${goal.yaw.toFixed(2)}`
        // );
    }

    // 建圖與導航切換訂閱不同topic進行機器定位
    switchPoseTopic(mode) {
        const ros = rosService.getRos();
        if (!ros) {
            console.warn("❌ ROS not connected");
            return;
        }

        // 取消前一個訂閱
        if (this.poseTopic) this.poseTopic.unsubscribe();

        // 切到 SLAM 時清除前一次導航資料
        if (mode === "slam") {
            if (this.renderer) {
                this.renderer.robotPose = null;
                this.renderer.targetPose = null;
                this.renderer.goal = null;
                this.renderer.goalYaw = 0;
            }
        }

        // 根據模式設定新的 topic
        let topicName, msgType;
        if (mode === "slam") {
            topicName = "/wheel_diff_drive_controller/odom";
            msgType = "nav_msgs/Odometry";

        } else if (mode === "nav") {
            topicName = "/amcl_pose";
            msgType = "geometry_msgs/msg/PoseWithCovarianceStamped";
        } else {
            console.warn("⚠️ Unknown mode:", mode);
            return;
        }

        // console.log(`📡 Switching to ${topicName} for ${mode} mode`);

        this.poseTopic = new ROSLIB.Topic({
            ros,
            name: topicName,
            messageType: msgType,
        });

        this.poseTopic.subscribe((msg) => {
            if (this.renderer) {
                this.renderer.updateRobotPose(msg); // 檢查 renderer
            } else {
                console.warn("Renderer not ready yet, skipping pose update");
            }
        });
    }

    // 提供給 Home.jsx 呼叫：切換導航模式
    setGoalMode(enable) {
        if (this.renderer) {
            this.renderer.setInteractionMode(enable ? "set_goal" : "pan");
            this.canvasRef.current.style.cursor = enable ? "crosshair" : "grab";
        }
    }

    render() {
        const { connected, mapReady } = this.state;
        let statusClass = "";
        let statusText = "";

        if (!connected) {
            statusClass = "waiting-ros";
            statusText = "等待 ROS 連線中 ...";
        } else if (!mapReady) {
            statusClass = "waiting-map";
            statusText = "MAP 無數據 ...";
        }

        return (
            <div className="map-container">
                <canvas
                    className="map-canvas"
                    ref={this.canvasRef}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{
                        opacity: mapReady ? 1 : 0.3,
                        filter: mapReady ? "none" : "blur(2px)",
                        transition: "opacity 0.5s ease",
                    }}
                />

                {(!connected || !mapReady) && (<div>
                    <span className={`map-status ${statusClass}`}>{statusText}</span>
                </div>)
                }
            </div>
        );
    }
}

export default Map;
