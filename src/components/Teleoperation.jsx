import { Component } from "react";
import Joystick from "./Joystick";
import rosService from "../scripts/RosService";
import Config from "../scripts/config";
import ROSLIB from "roslib";


class Teleoperation extends Component {
    constructor() {
        super();
        this.state = { connected: false };

        this.handleMove = this.handleMove.bind(this);
        this.handleStop = this.handleStop.bind(this);

        // 速度加速因子
        this.linFactor = 0.2;
        this.angFactor = 0.2;
        this.keysPressed = {};
    }

    componentDidMount() {
        // 監聽連線狀態
        this.interval = setInterval(() => {
            const isConn = rosService.isConnected();
            if (isConn !== this.state.connected) {
                this.setState({ connected: isConn });
            }
        }, 500);

        // 建立一次 cmd_vel Publisher（不要在每次 move 時重建）
        this.cmdVel = new ROSLIB.Topic({
            ros: rosService.getRos(),
            name: Config.CMD_VEL_TOPIC,
            messageType: "geometry_msgs/Twist",
        });

        // 鍵盤事件
        window.addEventListener("keydown", this.handleKeyDown);
        window.addEventListener("keyup", this.handleKeyUp);

        // 定時發布 Twist（每 100ms）
        this.keyLoop = setInterval(this.publishKeyboardTwist, 100);
    }

    componentWillUnmount() {
        clearInterval(this.interval);
        clearInterval(this.keyLoop);
        this.cmdVel = null;

        window.removeEventListener("keydown", this.handleKeyDown);
        window.removeEventListener("keyup", this.handleKeyUp);
    }

    // 按下鍵盤
    handleKeyDown = (e) => {
        this.keysPressed[e.key] = true;
    };

    // 放開鍵盤
    handleKeyUp = (e) => {
        delete this.keysPressed[e.key];

        // 放開時只重置對應的速度軸，不互相影響
        if (e.key === "ArrowUp" || e.key === "ArrowDown") this.linFactor = 0.2;
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") this.angFactor = 0.2;
    };

    // 根據按鍵狀態發送 Twist
    publishKeyboardTwist = () => {
        if (!rosService.isConnected() || !this.cmdVel) return;

        let key_lin = 0;
        let key_ang = 0;
        const LIN_SPEED = 0.7;  // 最大線速度
        const ANG_SPEED = 0.6;  // 最大角速度

        // 線速度獨立加速
        if (this.keysPressed["ArrowUp"] || this.keysPressed["ArrowDown"]) {
            this.linFactor = Math.min(this.linFactor + 0.05, 1.0);
        } else {
            this.linFactor = 0.2;
        }

        // 角速度獨立加速
        if (this.keysPressed["ArrowLeft"] || this.keysPressed["ArrowRight"]) {
            this.angFactor = Math.min(this.angFactor + 0.05, 1.0);
        } else {
            this.angFactor = 0.2;
        }

        if (this.keysPressed["ArrowUp"]) key_lin += LIN_SPEED * this.linFactor;
        if (this.keysPressed["ArrowDown"]) key_lin -= LIN_SPEED * this.linFactor;
        if (this.keysPressed["ArrowLeft"]) key_ang += ANG_SPEED * this.angFactor;
        if (this.keysPressed["ArrowRight"]) key_ang -= ANG_SPEED * this.angFactor;

        const twist = new ROSLIB.Message({
            linear: { x: key_lin, y: 0, z: 0 },
            angular: { x: 0, y: 0, z: key_ang },
        });

        this.cmdVel.publish(twist);
    };

    // Joystick控制
    handleMove(event) {
        if (!rosService.isConnected() || !this.cmdVel) return;

        const LIN_SPEED = 0.7;  // 最大線速度
        const ANG_SPEED = 0.6;  // 最大角速度

        const lin = -event.y * LIN_SPEED;
        const ang = -event.x * ANG_SPEED;

        const twist = new ROSLIB.Message({
            linear: { x: lin, y: 0, z: 0 },
            angular: { x: 0, y: 0, z: ang },
        });

        this.cmdVel.publish(twist);
    }

    handleStop() {
        if (!rosService.isConnected() || !this.cmdVel) return;

        // 停止時重置加速
        this.linFactor = 0.2;
        this.angFactor = 0.2;

        const twist = new ROSLIB.Message({
            linear: { x: 0, y: 0, z: 0 },
            angular: { x: 0, y: 0, z: 0 },
        });

        this.cmdVel.publish(twist);
    }

    render() {
        return (
            <div>
                <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                    <Joystick
                        size={140}
                        onMove={this.handleMove}
                        onStop={this.handleStop}
                    />
                </div>
            </div>
        );
    }
}

export default Teleoperation;
