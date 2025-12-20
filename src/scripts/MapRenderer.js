import pako from "pako";

export default class MapRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.mapCanvas = document.createElement("canvas");
        this.mapCtx = this.mapCanvas.getContext("2d");

        this.mapWidth = 0;
        this.mapHeight = 0;
        this.mapResolution = null;
        this.mapOrigin = null;

        this.lastRobotPose = null; // 保留最新 robot pose
        this.robotPose = null;
        this.targetPose = null;

        this.goal = null;
        this.tempGoalPos = null;
        this.tempGoalYaw = 0;
        this.choosingYaw = false;

        this.scale = 1.0;
        this.rotation = 0.0;
        this.offsetX = 0;
        this.offsetY = 0;

        this.dragMode = null;  // "pan" or "rotate"
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        this.interactionMode = "pan";

        this._animating = false;
        this._animationReq = null;

        // 綁定 Event handler
        this._bound_onWheel = this._onWheel.bind(this);
        this._bound_onMouseDown = this._onMouseDown.bind(this);
        this._bound_onMouseMove = this._onMouseMove.bind(this);
        this._bound_onMouseUp = this._onMouseUp.bind(this);
        this._bound_onDoubleClick = this._onDoubleClick.bind(this);
        this._bound_onContextMenu = (e) => { e.preventDefault(); };

        this.bindEvents();
    }

    destroy() {
        const c = this.canvas;
        c.removeEventListener("wheel", this._bound_onWheel);
        c.removeEventListener("mousedown", this._bound_onMouseDown);
        window.removeEventListener("mousemove", this._bound_onMouseMove);
        window.removeEventListener("mouseup", this._bound_onMouseUp);
        c.removeEventListener("dblclick", this._bound_onDoubleClick);
        c.removeEventListener("contextmenu", this._bound_onContextMenu);

        this._animating = false;
        if (this._animationReq) {
            cancelAnimationFrame(this._animationReq);
            this._animationReq = null;
        }
    }

    quaternionToYaw(q) {
        const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
        const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
        return Math.atan2(siny_cosp, cosy_cosp);
    }

    normalizeAngle(a) {
        while (a > Math.PI) a -= 2 * Math.PI;
        while (a < -Math.PI) a += 2 * Math.PI;
        return a;
    }

    resetView() {
        this.scale = 1.0;
        this.rotation = 0.0;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    resetMap() {
        this.resetView();
        this.mapWidth = 0;
        this.mapHeight = 0;
        this.mapResolution = null;
        this.mapOrigin = null;
        this.mapCanvas.width = 0;
        this.mapCanvas.height = 0;

        this.robotPose = null;      // 保留 targetPose/lastRobotPose，避免丟失最新位置
        this.targetPose = this.lastRobotPose ? { ...this.lastRobotPose } : null;

        this.goal = null;
        this.tempGoalPos = null;
        this.choosingYaw = false;

        this.draw();
    }

    updateRobotPose(msg) {
        if (!msg || !msg.pose || !msg.pose.position || !msg.pose.orientation) return;

        const newPose = {
            x: msg.pose.position.x,
            y: msg.pose.position.y,
            yaw: this.quaternionToYaw(msg.pose.orientation)
        };

        this.lastRobotPose = { ...newPose }; // 每次都存最新 pose

        // 地圖未準備好先 return
        if (!this.mapWidth || !this.mapHeight || !this.mapResolution || !this.mapOrigin) return;

        if (!this.robotPose) {
            this.robotPose = { ...newPose };
            this.targetPose = { ...newPose };
            this.centerViewOnRobot();  // 初次定位自動置中視角
            this.startAnimationLoop();
        } else {
            this.targetPose = { ...newPose };
        }

    }

    updateStaticMap(msg) {
        this.resetView();

        const info = msg.info;
        this.mapWidth = info.width;
        this.mapHeight = info.height;
        this.mapResolution = info.resolution;
        this.mapOrigin = {
            x: info.origin.position.x,
            y: info.origin.position.y
        };

        this.mapCanvas.width = this.mapWidth;
        this.mapCanvas.height = this.mapHeight;

        let data = msg.data;
        if (typeof data === "string") {
            try { data = JSON.parse(data); }
            catch (e) { console.warn("Map data parse error", e); return; }
        }
        if (!Array.isArray(data) || data.length !== this.mapWidth * this.mapHeight) {
            console.warn("Map data length mismatch");
            return;
        }

        const img = this.mapCtx.createImageData(this.mapWidth, this.mapHeight);
        for (let i = 0; i < data.length; i++) {
            const v = data[i];
            let c = 200;
            if (v === 100) c = 0;
            else if (v === 0) c = 255;

            const row = Math.floor(i / this.mapWidth);
            const col = i % this.mapWidth;
            const dst = (this.mapHeight - row - 1) * this.mapWidth + col;

            img.data[dst * 4 + 0] = c;
            img.data[dst * 4 + 1] = c;
            img.data[dst * 4 + 2] = c;
            img.data[dst * 4 + 3] = 255;
        }
        this.mapCtx.putImageData(img, 0, 0);

        // 重新建立時 goal 目標點箭頭消失
        this.goal = null;
        this.tempGoalPos = null;
        this.choosingYaw = false;

        // 地圖建立後，如果有 lastRobotPose 就更新 robot
        if (this.lastRobotPose) {
            this.updateRobotPose({
                pose: {
                    position: { x: this.lastRobotPose.x, y: this.lastRobotPose.y, z: 0 },
                    orientation: { x: 0, y: 0, z: Math.sin(this.lastRobotPose.yaw / 2), w: Math.cos(this.lastRobotPose.yaw / 2) }
                },
                twist: { linear: { x: 0 }, angular: { z: 0 } }
            });
        }

        this.draw();
    }

    applyMapUpdate(msg) {
        if (!msg?.update) return;
        if (!this.mapCanvas || !this.mapWidth || !this.mapHeight) return;

        const { x, y, width, height, encoding, data_b64, orig_len } = msg.update;

        if (encoding !== "zlib+base64") {
            console.warn("Unsupported map update encoding:", encoding);
            return;
        }

        // 1️⃣ base64 解碼
        let compressed;
        try {
            const binary_string = atob(data_b64);
            compressed = new Uint8Array(binary_string.length);
            for (let i = 0; i < binary_string.length; i++) {
                compressed[i] = binary_string.charCodeAt(i);
            }
        } catch (e) {
            console.warn("Base64 decode error", e);
            return;
        }

        // 2️⃣ zlib 解壓
        let data;
        try {
            data = pako.inflate(compressed);
        } catch (e) {
            console.warn("zlib decompress error", e);
            return;
        }

        if (data.length !== orig_len) {
            console.warn("Map update length mismatch", data.length, orig_len);
            return;
        }

        // 3️⃣ 將更新貼到 mapCanvas
        const img = this.mapCtx.getImageData(0, 0, this.mapWidth, this.mapHeight);

        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const idxUpdate = row * width + col;
                const value = data[idxUpdate]; // 0~100 or -1

                let c = 200;
                if (value === 100) c = 0;       // 障礙
                else if (value === 0) c = 255; // 空地
                // -1 或其他 => 保持灰色200

                const mapRow = y + row;
                const mapCol = x + col;

                if (mapRow >= this.mapHeight || mapCol >= this.mapWidth) continue;

                const dst = (this.mapHeight - mapRow - 1) * this.mapWidth + mapCol;
                img.data[dst * 4 + 0] = c;
                img.data[dst * 4 + 1] = c;
                img.data[dst * 4 + 2] = c;
                img.data[dst * 4 + 3] = 255;
            }
        }

        this.mapCtx.putImageData(img, 0, 0);
        this.draw();
    }

    centerViewOnRobot() {
        if (!this.robotPose || !this.mapWidth || !this.mapHeight) return;

        const px = (this.robotPose.x - this.mapOrigin.x) / this.mapResolution;
        const py = (this.robotPose.y - this.mapOrigin.y) / this.mapResolution;

        const centerX = this.mapWidth / 2;
        const centerY = this.mapHeight / 2;

        this.offsetX = centerX - px;
        this.offsetY = -(centerY - py);
    }

    startAnimationLoop() {
        if (this._animating) return;
        this._animating = true;

        const animate = () => {
            if (!this._animating) return;
            if (this.robotPose && this.targetPose) {
                const lerp = (a, b, t) => a + (b - a) * t;
                const t = 0.2;
                this.robotPose.x = lerp(this.robotPose.x, this.targetPose.x, t);
                this.robotPose.y = lerp(this.robotPose.y, this.targetPose.y, t);
                let yawDiff = this.normalizeAngle(this.targetPose.yaw - this.robotPose.yaw);
                this.robotPose.yaw += yawDiff * t;
            }
            this.draw();
            this._animationReq = requestAnimationFrame(animate);
        };
        this._animationReq = requestAnimationFrame(animate);
    }

    setInteractionMode(mode) {
        this.interactionMode = mode;
        if (mode !== "set_goal") {
            this.tempGoalPos = null;
            this.choosingYaw = false;
            this.draw();
        }
    }

    bindEvents() {
        const c = this.canvas;
        c.addEventListener("wheel", this._bound_onWheel, { passive: false });
        c.addEventListener("mousedown", this._bound_onMouseDown);
        window.addEventListener("mousemove", this._bound_onMouseMove);
        window.addEventListener("mouseup", this._bound_onMouseUp);
        c.addEventListener("dblclick", this._bound_onDoubleClick);
        c.addEventListener("contextmenu", this._bound_onContextMenu);
    }

    _onWheel(e) {
        e.preventDefault();
        const factor = 1.1;
        if (e.deltaY < 0) this.scale *= factor;
        else this.scale /= factor;
        this.draw();
    }

    _onMouseDown(e) {
        // 右鍵按住 -> rotate 地圖
        if (e.button === 2) {
            this.dragMode = "rotate";
            this.isDragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            return;
        }
        if (e.button !== 0) return;

        if (this.interactionMode === "set_goal") {
            const world = this.screenToWorld(e.clientX, e.clientY);
            this.tempGoalPos = world;
            this.choosingYaw = true;
            this.tempGoalYaw = 0;
            this.canvas.style.cursor = "crosshair";
        } else {
            this.dragMode = "pan";
            this.isDragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.canvas.style.cursor = "grab";
        }
    }

    _onMouseMove(e) {
        if (this.choosingYaw && this.tempGoalPos) {
            const world = this.screenToWorld(e.clientX, e.clientY);
            const dx = world.x - this.tempGoalPos.x;
            const dy = world.y - this.tempGoalPos.y;
            this.tempGoalYaw = Math.atan2(dy, dx);
            this.draw();
        } else if (this.isDragging) {
            const dx = e.clientX - this.lastMouseX;
            const dy = e.clientY - this.lastMouseY;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;

            if (this.dragMode === "pan") {
                this.offsetX += dx;
                this.offsetY += dy;
            } else if (this.dragMode === "rotate") {
                this.rotation += dx * 0.005;
            }
            this.draw();
        }
    }

    _onMouseUp(e) {
        if (e.button === 2) {
            this.isDragging = false;
            this.dragMode = null;
            this.canvas.style.cursor = "default";
            return;
        }
        if (e.button !== 0) return;

        if (this.choosingYaw && this.tempGoalPos) {
            this.goal = {
                x: this.tempGoalPos.x,
                y: this.tempGoalPos.y,
                yaw: this.tempGoalYaw
            };
            if (this.onGoalSelected) this.onGoalSelected(this.goal);
            this.tempGoalPos = null;
            this.choosingYaw = false;
            // 設定完目標後，把 cursor／interactionMode 還原為 pan 模式
            this.interactionMode = "pan";
            this.canvas.style.cursor = "grab";
            this.draw();
        }
        this.isDragging = false;
        this.dragMode = null;
    }

    _onDoubleClick(e) {
        this.resetView();
        this.draw();
    }

    screenToWorld(clientX, clientY) {
        if (!this.mapWidth || !this.mapHeight || !this.mapResolution || !this.mapOrigin) {
            return { x: 0, y: 0 };
        }
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const parent = this.canvas.parentElement;
        const W = parent.clientWidth;
        const H = parent.clientHeight;
        const fit = Math.min(W / this.mapWidth, H / this.mapHeight);

        const cx = W / 2 + this.offsetX;
        const cy = H / 2 + this.offsetY;
        const dx = (x - cx) / (fit * this.scale);
        const dy = (y - cy) / (fit * this.scale);

        const cosR = Math.cos(-this.rotation);
        const sinR = Math.sin(-this.rotation);
        const rx = dx * cosR - dy * sinR;
        const ry = dx * sinR + dy * cosR;

        const mapX = this.mapWidth / 2 + rx;
        const mapY = this.mapHeight / 2 - ry;

        return {
            x: this.mapOrigin.x + mapX * this.mapResolution,
            y: this.mapOrigin.y + mapY * this.mapResolution
        };
    }

    draw() {
        if (!this.mapCanvas || !this.mapResolution || !this.mapOrigin) return;

        const c = this.canvas;
        const ctx = this.ctx;
        const parent = c.parentElement;
        const W = parent.clientWidth;
        const H = parent.clientHeight;
        const dpr = window.devicePixelRatio || 1;
        c.width = Math.round(W * dpr);
        c.height = Math.round(H * dpr);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, W, H);

        const fit = Math.min(W / this.mapWidth, H / this.mapHeight);

        ctx.save();
        ctx.translate(W / 2 + this.offsetX, H / 2 + this.offsetY);
        ctx.scale(fit * this.scale, fit * this.scale);
        ctx.rotate(this.rotation);

        ctx.drawImage(this.mapCanvas, -this.mapWidth / 2, -this.mapHeight / 2);

        // draw robot
        if (this.robotPose) {
            const px = (this.robotPose.x - this.mapOrigin.x) / this.mapResolution;
            const py = (this.robotPose.y - this.mapOrigin.y) / this.mapResolution;
            const robotX = px - this.mapWidth / 2;
            const robotY = -(py - this.mapHeight / 2);

            ctx.save();
            ctx.translate(robotX, robotY);
            ctx.rotate(-this.robotPose.yaw + Math.PI / 2);
            const size = 8;
            ctx.fillStyle = "red";
            ctx.beginPath();
            ctx.moveTo(0, -size);
            ctx.lineTo(size * 0.6, size);
            ctx.lineTo(-size * 0.6, size);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // draw goal if exists
        if (this.goal) {
            const px = (this.goal.x - this.mapOrigin.x) / this.mapResolution;
            const py = (this.goal.y - this.mapOrigin.y) / this.mapResolution;
            const goalX = px - this.mapWidth / 2;
            const goalY = -(py - this.mapHeight / 2);
            ctx.save();
            ctx.translate(goalX, goalY);
            ctx.rotate(this.goal.yaw || 0);
            ctx.strokeStyle = "limegreen";
            ctx.fillStyle = "limegreen";
            ctx.lineWidth = 2 / this.scale;
            ctx.beginPath();
            ctx.moveTo(-20 / this.scale, 0);
            ctx.lineTo(0, 0);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-5 / this.scale, -5 / this.scale);
            ctx.lineTo(-5 / this.scale, 5 / this.scale);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // draw temp-goal arrow (during yaw selection)
        if (this.choosingYaw && this.tempGoalPos) {
            const px = (this.tempGoalPos.x - this.mapOrigin.x) / this.mapResolution;
            const py = (this.tempGoalPos.y - this.mapOrigin.y) / this.mapResolution;
            const goalX = px - this.mapWidth / 2;
            const goalY = -(py - this.mapHeight / 2);
            ctx.save();
            ctx.translate(goalX, goalY);
            ctx.rotate(this.tempGoalYaw);
            ctx.strokeStyle = "limegreen";
            ctx.fillStyle = "limegreen";
            ctx.lineWidth = 2 / this.scale;
            ctx.beginPath();
            ctx.moveTo(-20 / this.scale, 0);
            ctx.lineTo(0, 0);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-5 / this.scale, -5 / this.scale);
            ctx.lineTo(-5 / this.scale, 5 / this.scale);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();
    }
}
