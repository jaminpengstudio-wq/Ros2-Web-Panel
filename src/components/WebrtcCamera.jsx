import { Component, createRef } from "react";
import KvsWebrtcClient from "../scripts/KvsWebrtcClient";
import { getAwsKvsCredentials } from "../scripts/AwsCredentialApi";
import { startCameraGstreamer, stopCameraGstreamer } from "../scripts/rosApi";

class WebrtcCamera extends Component {
    videoRef = createRef();

    state = {
        loading: false,   // 是否正在連線
        error: null,      // 連線錯誤訊息
        connected: false, // WebRTC 是否已啟動

        cameraRunning: false,  // ROS camera 是否啟動
        camLoading: false,     // ROS camera 是否啟動中
        cameraCooldown: false, // 按下停止攝影機按鈕後2 秒才能再按啟動
    };

    kvsClient = null;
    errorTimer = null;
    cooldownTimer = null;

    // 顯示錯誤（2 秒後自動消失）
    showError = (message) => {
        this.setState({ error: message });

        if (this.errorTimer) clearTimeout(this.errorTimer);
        this.errorTimer = setTimeout(() => {
            this.setState({ error: null });
        }, 2000);
    };

    // 啟動 KVS WebRTC Viewer
    startWebrtc = async () => {
        this.setState({ loading: true, error: null });

        try {
            // 1️⃣ 向 server 取得 AWS temporary credentials
            const aws = await getAwsKvsCredentials();

            // 2️⃣ 建立 KVS WebRTC Viewer
            this.kvsClient = new KvsWebrtcClient({
                channelName: "jam-kvs-webrtc-channel",
                region: aws.region,
                credentials: {
                    accessKeyId: aws.accessKeyId,
                    secretAccessKey: aws.secretAccessKey,
                    sessionToken: aws.sessionToken,
                },
                onTrack: (stream) => {
                    if (this.videoRef.current) {
                        this.videoRef.current.srcObject = stream;
                    }
                },
            });

            // 3️⃣ 啟動
            await this.kvsClient.start();
            this.setState({ loading: false, connected: true });

        } catch (err) {
            this.setState({ loading: false, connected: false });
            this.showError("WebRTC 影像連線失敗");
        }
    };

    // 停止影像 KVS WebRTC Viewer
    stopWebrtc = () => {
        if (this.kvsClient) {
            this.kvsClient.stop();
            this.kvsClient = null;
        }
        if (this.videoRef.current) {
            this.videoRef.current.srcObject = null;
        }
        this.setState({ connected: false });
    };

    // ROS Camera Gstreamer pipeline start/stop handler
    toggleCamera = async () => {
        this.setState({ camLoading: true });
        const { cameraRunning } = this.state;

        try {
            if (!cameraRunning) {
                await startCameraGstreamer();
                this.setState({ cameraRunning: true });
            } else {
                await stopCameraGstreamer();

                this.setState({
                    cameraRunning: false,
                    cameraCooldown: true, // 進入停止攝影機兩秒時間
                });

                // 2 秒後解除
                this.cooldownTimer = setTimeout(() => {
                    this.setState({ cameraCooldown: false });
                }, 2000);
            }
        } catch (err) {
            console.error("Camera 切換失敗:", err);
        } finally {
            this.setState({ camLoading: false });
        }
    };

    componentWillUnmount() {
        // 清理 WebRTC
        this.stopWebrtc();

        if (this.cooldownTimer) clearTimeout(this.cooldownTimer);
        if (this.errorTimer) clearTimeout(this.errorTimer);
    }

    render() {
        const { loading, error, connected, cameraRunning, camLoading, cameraCooldown } = this.state;

        const cameraDisabled = camLoading || cameraCooldown;

        return (
            <div className="webrtc-camera-container">
                <div className="webrtc-btn-group">
                    {/* WebRTC Viewer 啟動 / 停止 */}
                    {!connected ? (
                        <button
                            onClick={this.startWebrtc}
                            disabled={loading}
                            className="webrtc-btn"
                        >
                            {loading ? "連線中..." : "啟動影像"}
                        </button>
                    ) : (
                        <button
                            onClick={this.stopWebrtc}
                            className={`webrtc-btn webrtc-btn-active`}
                        >
                            停止影像
                        </button>
                    )}

                    {/* ROS Camera Master 啟動 / 停止 */}
                    <button
                        onClick={this.toggleCamera}
                        disabled={cameraDisabled}
                        className={`webrtc-btn ${cameraRunning ? "webrtc-btn-active" : ""
                            }`}
                    >
                        {camLoading
                            ? "處理中..."
                            : cameraCooldown
                                ? "關閉中..."
                                : cameraRunning
                                    ? "停止攝影機"
                                    : "啟動攝影機"}
                    </button>
                </div>

                {/* Video 區塊（含錯誤 overlay） */}
                <div className="webrtc-video-wrapper">
                    <video
                        ref={this.videoRef}
                        autoPlay
                        playsInline
                        muted
                        controls={false}
                        className="webrtc-video"
                    />

                    {!connected && error && (
                        <div className="webrtc-video-error">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        );
    }
}

export default WebrtcCamera;
