import { Component } from "react";
import ROSLIB from "roslib";
import rosService from "../scripts/RosService";


class Camera extends Component {
    constructor(props) {
        super(props);
        this.state = {
            connected: false,
            activeCam: "front", // 主畫面
            imgFront: null,
            imgBack: null,
            imgLeft: null,
            imgRight: null,
        };

        this.frontTopic = null;
        this.backTopic = null;
        this.leftTopic = null;
        this.rightTopic = null;
    }

    componentDidMount() {
        // 檢查 ros 連線狀態後啟動訂閱
        this.interval = setInterval(() => {
            const isConn = rosService.isConnected();

            if (isConn && !this.state.connected) {
                this.setState({ connected: true }, () => {
                    const ros = rosService.getRos();
                    this.initRosCameras(ros);
                });
            } else if (!isConn && this.state.connected) {
                // 斷線 → 重置狀態
                ["front", "back", "left", "right"].forEach(cam => {
                    if (this[cam + "Topic"]) this[cam + "Topic"].unsubscribe();
                    this[cam + "Topic"] = null;
                });

                this.setState({
                    connected: false,
                    imgFront: null,
                    imgBack: null,
                    imgLeft: null,
                    imgRight: null,
                });
            }
        }, 500);
    }

    componentWillUnmount() {
        clearInterval(this.interval);
        ["front", "back", "left", "right"].forEach(cam => {
            if (this[cam + "Topic"]) this[cam + "Topic"].unsubscribe();
        });
    }

    initRosCameras(ros) {
        const cameras = [
            { name: "front", topic: "/camera_front/image_raw/compressed" },
            { name: "back", topic: "/camera_back/image_raw/compressed" },
            { name: "left", topic: "/camera_left/image_raw/compressed" },
            { name: "right", topic: "/camera_right/image_raw/compressed" },
        ];

        cameras.forEach(cam => {
            const rosTopic = new ROSLIB.Topic({
                ros,
                name: cam.topic,
                messageType: "sensor_msgs/msg/CompressedImage",
            });
            rosTopic.subscribe((msg) => {
                const src = "data:image/jpeg;base64," + msg.data;
                this.setState({ ["img" + cam.name.charAt(0).toUpperCase() + cam.name.slice(1)]: src });
            });
            this[cam.name + "Topic"] = rosTopic;
        });

        // console.log("✅ 已訂閱相機影像");
    }

    handleSwap = (camName) => {
        this.setState({ activeCam: camName });
    };

    render() {
        const { connected, activeCam, imgFront, imgBack, imgLeft, imgRight } = this.state;
        const camMap = {
            front: { img: imgFront, label: "前鏡頭" },
            back: { img: imgBack, label: "後鏡頭" },
            left: { img: imgLeft, label: "左鏡頭" },
            right: { img: imgRight, label: "右鏡頭" },
            test1: { img: null, label: "測試鏡頭1" },   // 測試用
            test2: { img: null, label: "測試鏡頭2" },   // 測試用
            test3: { img: null, label: "測試鏡頭3" },   // 測試用
        };

        const mainImg = camMap[activeCam].img;

        // 下方子畫面，排除當前主畫面
        const smallCams = Object.keys(camMap).filter(c => c !== activeCam);

        return (
            <div className="camera-container">
                {/* 主畫面 */}
                <div className="camera-main">
                    {!connected ? (
                        <span className="status-waiting-ros">等待 ROS 連線中 ...</span>
                    ) : mainImg ? (
                        <img src={mainImg} alt="Main Camera" onContextMenu={(e) => e.preventDefault()} />
                    ) : (
                        <span className="status-waiting-image">Camera 無訊號 ...</span>
                    )}
                </div>

                {/* 子畫面列 */}
                <div className="camera-thumbnails">
                    {smallCams.map((c) => {
                        const cam = camMap[c];
                        return (
                            <div className="camera-thumb" key={c} onClick={() => this.handleSwap(c)}
                                style={{ backgroundColor: cam.img ? "#222" : "#444", }}
                            >
                                {cam.img ? (
                                    <img src={cam.img} alt={cam.label} />
                                ) : (
                                    <span>等待 {cam.label}...</span>
                                )}
                                <div className="camera-label">
                                    {cam.label}（點擊切換）
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

}

export default Camera;
