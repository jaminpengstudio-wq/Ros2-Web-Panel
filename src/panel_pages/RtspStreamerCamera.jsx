import { Component, createRef } from "react";
import Hls from "hls.js";

class RtspStreamerCamera extends Component {
    constructor(props) {
        super(props);
        this.videoRef = createRef();
        this.hls = null;

        this.state = {
            reloadKey: 0,
            error: false,
            initialized: false,
        };
    }

    componentDidMount() {
        setTimeout(() => {
            this.reloadComponent();
        }, 0);
    }

    componentDidUpdate(prevProps) {
        if (prevProps.currentMode === "idle" && this.props.currentMode !== "idle") {
            setTimeout(() => {
                this.reloadComponent();
            }, 200);
        }
    }

    reloadComponent = async () => {
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }

        const video = this.videoRef.current;
        if (video) {
            video.pause();
            video.removeAttribute("src");
            video.load();
        }

        this.setState({
            error: false,
            initialized: false
        });

        const hlsUrl = "http://hls_bot1_camera.jampenglab.tw/bot1/frontCam/index.m3u8";

        try {
            await fetch(hlsUrl, { method: "HEAD" });
            this.initHLS(hlsUrl);
        } catch {
            this.setState({ error: true });
        }
    };

    initHLS = (hlsUrl) => {
        const video = this.videoRef.current;
        if (!video) return;

        const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true
        });
        this.hls = hls;

        hls.attachMedia(video);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
            hls.loadSource(hlsUrl);
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            this.setState({ initialized: true });

            video.play().catch(() => { });
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
                this.setState({ error: true });
            }
        });
    };

    componentWillUnmount() {
        if (this.hls) this.hls.destroy();
    }

    render() {
        const { currentMode } = this.props;
        const { error } = this.state;
        const isIdle = currentMode === "idle";

        return (
            <div className="rtsp-camera-container">

                {/* Reload button */}
                {!isIdle && (
                    <div className="rtsp-btn-group">
                        <button
                            className="rtsp-btn-reload"
                            onClick={this.reloadComponent}
                        >
                            影像連線
                        </button>
                    </div>
                )}

                <video
                    key={this.state.reloadKey}
                    ref={this.videoRef}
                    autoPlay
                    controls
                    className="rtsp-video"
                    style={{ opacity: isIdle ? 0 : 1 }}
                />

                {/* Idle 顯示 */}
                {isIdle && (
                    <div className="rtsp-overlay">等待連線中 ...</div>
                )}

                {/* Error 顯示 */}
                {!isIdle && error && (
                    <div className="rtsp-overlay rtsp-error">
                        影像尚未連線
                    </div>
                )}

            </div>
        );
    }
}

export default RtspStreamerCamera;
