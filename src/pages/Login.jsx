import { Component, createRef } from "react";
import { Navigate } from "react-router-dom";

class Login extends Component {
    state = {
        username: "",
        password: "",
        loggedIn: false,
    };

    usernameRef = createRef();

    handleLogin = () => {
        // 去除前後空白
        const username = this.state.username.trim();
        const password = this.state.password.trim();

        // ⚠️ 這裡之後可換成 API 驗證
        if (username === "admin" && password === "1234") {
            sessionStorage.setItem("isLogin", "true");
            this.setState({ loggedIn: true });
        } else {
            alert("登入失敗");
            this.setState({ username: "", password: "" }, () => {
                // 登入失敗後自動focus on帳號欄
                if (this.usernameRef.current) {
                    this.usernameRef.current.focus();
                }
            });
        }
    };

    handleKeyDown = (e) => {
        if (e.key === "Enter") {
            this.handleLogin();
        }
    };

    render() {
        if (this.state.loggedIn) {
            return <Navigate to="/panel" replace />;
        }

        return (
            <div className="login-page">
                <div className="login-card">

                    <div className="login-header">
                        <h1>遠端監控系統</h1>
                        <p>Remote Control System</p>
                    </div>

                    <div className="login-form">
                        <input
                            type="text"
                            placeholder="帳號"
                            value={this.state.username}
                            ref={this.usernameRef}
                            maxLength={20}
                            onChange={(e) => this.setState({ username: e.target.value })}
                            onKeyDown={this.handleKeyDown}
                        />

                        <input
                            type="password"
                            placeholder="密碼"
                            value={this.state.password}
                            maxLength={12}
                            onChange={(e) => this.setState({ password: e.target.value })}
                            onKeyDown={this.handleKeyDown}
                        />
                    </div>

                    <div className="login-actions">
                        <button onClick={this.handleLogin}>登入系統</button>
                    </div>
                </div>
            </div>
        );
    }
}

export default Login;
