// 專門負責「地圖與機器位置繪製」與「互動事件」處理

export default class MapRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        // 視圖狀態
        this.scale = 1.0;         // 縮放比例
        this.rotation = 0;        // 旋轉角度 (radians)
        this.offsetX = 0;         // 平移X
        this.offsetY = 0;         // 平移Y
        this.dragMode = null;     // "rotate" 或 "pan"
        this.isDragging = false;

        this.mapImageData = null;
        this.mapWidth = 0;
        this.mapHeight = 0;

        // 機器位置
        this.robotPose = null;
        this.targetPose = null;

        // 導航
        this.goal = null;
        this.interactionMode = "pan";

        this.draggingGoal = false;      // 是否正在拖動設定方向
        this.goalStart = null;          // 初始點 (x, y) 世界座標
        this.goalYaw = 0;               // 箭頭方向

        this.bindEvents();
    }

    // 切換導航和地圖移動模式
    setInteractionMode(mode) {
        this.interactionMode = mode;
        console.log(`🟢 模式切換為：${mode}`);
    }

    // 四元數轉 yaw
    quaternionToYaw(q) {
        const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
        const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
        return Math.atan2(siny_cosp, cosy_cosp);
    }

    // 角度標準化
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }

    // 更新機器位置
    updateRobotPose(msg) {
        const pose = msg.pose.pose;
        const newPose = {
            x: pose.position.x,
            y: pose.position.y,
            yaw: this.quaternionToYaw(pose.orientation),
        };

        // 初始化
        if (!this.robotPose) {
            this.robotPose = { ...newPose };
            this.targetPose = { ...newPose };
            this.startPoseAnimation();
            this.drawMap();
            return;
        }

        // 更新 targetPose，但不要打斷動畫
        this.targetPose = { ...newPose };
    }

    // 長駐的動畫 loop（不會被中斷）
    startPoseAnimation() {
        let lastTime = performance.now();
        const baseSmooth = 0.03; // 小：更平滑，大：更靈敏

        const animate = (time) => {
            const dt = (time - lastTime) / 750;
            lastTime = time;

            if (this.robotPose && this.targetPose) {
                const lerp = (a, b, t) => a + (b - a) * t;
                const smoothFactor = 1 - Math.pow(1 - baseSmooth, dt * 20); // 與 FPS 無關的平滑度

                // ➤ 線性移動 + 慢進慢出
                const dx = this.targetPose.x - this.robotPose.x;
                const dy = this.targetPose.y - this.robotPose.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const easing = Math.min(1.0, Math.pow(dist * 3, 0.5)); // 根據距離調整速度，近時減速

                this.robotPose.x = lerp(this.robotPose.x, this.targetPose.x, smoothFactor * easing);
                this.robotPose.y = lerp(this.robotPose.y, this.targetPose.y, smoothFactor * easing);

                // ➤ 平滑旋轉，避免角度跳變
                let yawDiff = this.normalizeAngle(this.targetPose.yaw - this.robotPose.yaw);
                const yawEasing = Math.min(1.0, Math.abs(yawDiff) * 1.5); // 角度接近時放慢
                this.robotPose.yaw += yawDiff * smoothFactor * yawEasing;

                // ➤ 誤差太小則 snap，避免抖動
                if (dist < 0.0003 && Math.abs(yawDiff) < 0.001)
                    this.robotPose = { ...this.targetPose };
            }

            this.drawMap();
            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }

    bindEvents() {
        this.canvas.addEventListener("wheel", this.handleWheel.bind(this), { passive: false });
        this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
        window.addEventListener("mouseup", this.handleMouseUp.bind(this));
        window.addEventListener("mousemove", this.handleMouseMove.bind(this));
        this.canvas.addEventListener("dblclick", this.handleDoubleClick.bind(this));  // 雙擊事件監聽(恢復地圖初始狀態)

        // 點選導航目標
        this.canvas.addEventListener("click", this.handleClick.bind(this));

        // 避免右鍵旋轉時彈出預設選單
        this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    }

    destroy() {
        this.canvas.removeEventListener("wheel", this.handleWheel);
        this.canvas.removeEventListener("mousedown", this.handleMouseDown);
        window.removeEventListener("mouseup", this.handleMouseUp);
        window.removeEventListener("mousemove", this.handleMouseMove);
        this.canvas.removeEventListener("dblclick", this.handleDoubleClick);
    }

    handleWheel(e) {
        e.preventDefault();
        const zoomFactor = 1.1;
        if (e.deltaY < 0) this.scale *= zoomFactor;
        else this.scale /= zoomFactor;
        this.drawMap();
    }

    handleMouseDown(e) {
        if (e.button === 0) {
            if (this.interactionMode === "set_goal") {
                // 開始拖動箭頭設定方向
                const worldPos = this.screenToWorld(e.clientX, e.clientY);
                this.goalStart = worldPos;
                this.draggingGoal = true;
            } else {
                // 拖曳地圖
                this.dragMode = "pan";
                this.isDragging = true;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
            }
        } else if (e.button === 2) {
            // 右鍵旋轉（可以保留，視需求）
            this.dragMode = "rotate";
            this.isDragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        }
    }

    handleMouseUp() {
        if (this.draggingGoal && this.goalStart) {
            const goal = {
                x: this.goalStart.x,
                y: this.goalStart.y,
                yaw: this.goalYaw,
            };
            if (this.onGoalSelected) this.onGoalSelected(goal);

            this.goal = { x: goal.x, y: goal.y }; // 保留目標位置
            this.draggingGoal = false;
            this.goalStart = null;

            // 回到拖曳模式
            this.setInteractionMode("pan");
            if (this.canvas) this.canvas.style.cursor = "grab";
            this.drawMap();
        }

        this.isDragging = false;
        this.dragMode = null;
    }

    handleMouseMove(e) {
        if (this.draggingGoal && this.goalStart) {
            const worldPos = this.screenToWorld(e.clientX, e.clientY);
            const dx = worldPos.x - this.goalStart.x;
            const dy = this.goalStart.y - worldPos.y;
            this.goalYaw = Math.atan2(dy, dx);
            this.goal = { x: this.goalStart.x, y: this.goalStart.y };
            this.drawMap();
        } else if (this.isDragging) {
            const deltaX = e.clientX - this.lastMouseX;
            const deltaY = e.clientY - this.lastMouseY;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;

            if (this.dragMode === "rotate") this.rotation += deltaX * 0.005;
            else if (this.dragMode === "pan") {
                this.offsetX += deltaX;
                this.offsetY += deltaY;
            }
            this.drawMap();
        }
    }

    handleDoubleClick(e) {
        // 重置所有視圖參數
        this.scale = 1.0;
        this.rotation = 0;
        this.offsetX = 0;
        this.offsetY = 0;

        // 重新繪製地圖
        this.drawMap();
    }

    handleClick(e) {
        if (!this.latestMap) return;
        if (this.interactionMode !== "set_goal") return; // 只有導航模式才生效
    }

    updateMap(msg) {
        this.latestMap = msg;  // 儲存完整 map 資訊（resolution / origin）

        const width = msg.info.width;
        const height = msg.info.height;

        // 🛑 地圖未初始化或 ROS 重啟時會出現 width=0, height=0
        if (!width || !height || width <= 0 || height <= 0) {
            console.warn("⚠️ Invalid map size received, ignoring this frame:", width, height);
            return;
        }

        // 🛑 資料量不符（ROS 正在重啟中）
        if (msg.data.length !== width * height) {
            console.warn(
                `⚠️ Map data mismatch: got ${msg.data.length}, expected ${width * height}`
            );
            return;
        }

        const data = msg.data;

        const offCanvas = document.createElement("canvas");
        offCanvas.width = width;
        offCanvas.height = height;
        const ctx = offCanvas.getContext("2d");
        const imgData = ctx.createImageData(width, height);

        for (let i = 0; i < data.length; i++) {
            let color;
            if (data[i] === 100) color = 0;        // 障礙物 → 黑
            else if (data[i] === 0) color = 255;   // 空白 → 白
            else color = 200;                      // 未知 → 灰

            const row = Math.floor(i / width);
            const col = i % width;
            const flippedIndex = (height - row - 1) * width + col;

            imgData.data[flippedIndex * 4 + 0] = color;
            imgData.data[flippedIndex * 4 + 1] = color;
            imgData.data[flippedIndex * 4 + 2] = color;
            imgData.data[flippedIndex * 4 + 3] = 255;
        }

        this.mapImageData = imgData;
        this.mapWidth = width;
        this.mapHeight = height;
        this.drawMap();
    }

    drawMap() {
        const { canvas, ctx } = this;
        if (!canvas || !this.mapImageData) return;

        const parent = canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = parent.clientWidth;
        const displayHeight = parent.clientHeight;

        // 設定 canvas 實際像素大小（避免 CSS 縮放引起模糊）
        canvas.width = Math.round(displayWidth * dpr);
        canvas.height = Math.round(displayHeight * dpr);

        // 每次都先重置 transform，避免累乘
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // 對高 DPI 做縮放（一次）
        ctx.scale(dpr, dpr);

        // 關閉平滑
        ctx.imageSmoothingEnabled = false;

        // 清畫布（注意：clear 要用顯示尺寸而非實際像素尺寸，因為 ctx 已 scale(dpr)）
        ctx.clearRect(0, 0, displayWidth, displayHeight);

        // 計算讓地圖 fit 在畫布的 scale（以 map 像素為單位）
        const fitScale = Math.min(displayWidth / this.mapWidth, displayHeight / this.mapHeight);

        ctx.save();

        // 把原點移到畫布中心（以 顯示像素 為單位）
        ctx.translate(displayWidth / 2 + this.offsetX, displayHeight / 2 + this.offsetY);
        ctx.scale(fitScale * this.scale, fitScale * this.scale);
        ctx.rotate(this.rotation);

        // 把 ImageData 放到臨時 canvas，再 drawImage（這樣縮放時較不模糊）
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = this.mapWidth;
        tempCanvas.height = this.mapHeight;
        const tempCtx = tempCanvas.getContext("2d");
        tempCtx.putImageData(this.mapImageData, 0, 0);
        tempCtx.imageSmoothingEnabled = false;
        ctx.drawImage(tempCanvas, -this.mapWidth / 2, -this.mapHeight / 2);

        // 🟥 繪製機器位置
        if (this.robotPose && this.latestMap) {
            // 從最新的 map 拿 resolution / origin（注意 ROS nav_msgs/OccupancyGrid 結構）
            const mapResolution = this.latestMap.info.resolution;   // 公尺/像素
            const mapOrigin = this.latestMap.info.origin.position;  // { x, y, z }

            // 將世界座標轉為地圖像素座標
            const px = (this.robotPose.x - mapOrigin.x) / mapResolution;
            const py = (this.robotPose.y - mapOrigin.y) / mapResolution;

            // 對應到畫布中心的偏移
            const robotX = px - this.mapWidth / 2;
            const robotY = -(py - this.mapHeight / 2); // y 反轉（圖像座標 vs 世界座標）

            ctx.save();
            ctx.translate(robotX, robotY);
            ctx.rotate(-this.robotPose.yaw + Math.PI / 2); // 方向可能需反號（檢查並調整 + 或 -）(Math.PI / 2 右轉箭頭 90 度)

            // 畫一個小箭頭表示 robot
            // 🔧 根據縮放程度調整箭頭大小（避免全圖時太大）
            const baseSize = 8;                                // 基礎箭頭大小
            const zoomFactor = Math.max(0.3, 1 / this.scale);  // 最小不低於 0.4，避免太小
            const markerSize = baseSize * zoomFactor;

            ctx.fillStyle = "red";
            ctx.beginPath();
            ctx.moveTo(0, -markerSize);
            ctx.lineTo(markerSize * 0.6, markerSize);
            ctx.lineTo(-markerSize * 0.6, markerSize);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }

        // 🟢 繪製導航目標地點
        if (this.goal && this.latestMap) {
            const mapResolution = this.latestMap.info.resolution;
            const mapOrigin = this.latestMap.info.origin.position;
            const px = (this.goal.x - mapOrigin.x) / mapResolution;
            const py = (this.goal.y - mapOrigin.y) / mapResolution;

            const goalX = px - this.mapWidth / 2;
            const goalY = -(py - this.mapHeight / 2);

            ctx.save();
            ctx.translate(goalX, goalY);

            // 無論是否拖曳都根據 this.goalYaw 旋轉
            ctx.rotate(this.goalYaw || 0);

            ctx.strokeStyle = "limegreen";
            ctx.fillStyle = "limegreen";
            ctx.lineWidth = 2 / this.scale;

            // 箭身
            ctx.beginPath();
            ctx.moveTo(-20 / this.scale, 0);
            ctx.lineTo(0, 0);
            ctx.stroke();

            // 箭頭三角形
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

    // 螢幕座標 → 世界座標
    screenToWorld(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        // canvas 座標 → map pixel 座標
        const parent = this.canvas.parentElement;
        const displayWidth = parent.clientWidth;
        const displayHeight = parent.clientHeight;
        const fitScale = Math.min(displayWidth / this.mapWidth, displayHeight / this.mapHeight);

        // 移除畫布偏移與縮放、旋轉的影響
        const cx = displayWidth / 2 + this.offsetX;
        const cy = displayHeight / 2 + this.offsetY;
        const dx = (x - cx) / (fitScale * this.scale);
        const dy = (y - cy) / (fitScale * this.scale);

        // 旋轉反轉（因為畫布有被 rotate）
        const cosR = Math.cos(-this.rotation);
        const sinR = Math.sin(-this.rotation);
        const rx = dx * cosR - dy * sinR;
        const ry = dx * sinR + dy * cosR;

        // 轉成地圖座標（像素）
        const mapX = this.mapWidth / 2 + rx;
        const mapY = this.mapHeight / 2 - ry;

        // 轉世界座標
        const mapResolution = this.latestMap.info.resolution;
        const mapOrigin = this.latestMap.info.origin.position;
        const worldX = mapOrigin.x + mapX * mapResolution;
        const worldY = mapOrigin.y + mapY * mapResolution;

        return { x: worldX, y: worldY };
    }

}
