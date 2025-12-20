import { Component } from "react";
import { Link } from "react-router-dom";

class Header extends Component {
    constructor(props) {
        super(props);
        const savedState = localStorage.getItem("sidebarOpen") === "true";
        this.state = { isOpen: savedState };
    }

    toggleSidebar = () => {
        this.setState(
            (prev) => {
                const newState = !prev.isOpen;
                localStorage.setItem("sidebarOpen", newState);
                return { isOpen: newState };
            }
        );
    };

    closeSidebar = () => {
        this.setState({ isOpen: false }, () => {
            localStorage.setItem("sidebarOpen", "false");
        });
    };

    render() {
        const { isOpen } = this.state;

        return (
            <div className={`sidebar ${isOpen ? "open" : "collapsed"}`}>
                <div className="sidebar-header">
                    <span className="brand" onClick={this.toggleSidebar}>
                        ROS II PANEL
                    </span>
                </div>

                {isOpen && (
                    <nav className="sidebar-links">
                        <Link to="/" className="nav-item" onClick={this.closeSidebar}>Info</Link>
                        <Link to="/panel" className="nav-item" onClick={this.closeSidebar}>Panel</Link>
                    </nav>
                )}
            </div>
        );
    }
}

export default Header;
