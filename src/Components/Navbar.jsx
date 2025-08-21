import React from "react";
import { Link } from "react-router-dom";
import { FaHome } from "react-icons/fa";
import { RiBarChartBoxAiFill } from "react-icons/ri";
import { IoChatboxEllipses } from "react-icons/io5";
import { LuGoal } from "react-icons/lu";
import { MdKeyboardVoice } from "react-icons/md";

const Navbar = () => {
  const Path = [
    { route: "/", component: <FaHome />, title: "Home" },
    {
      route: "/dashboard",
      component: <RiBarChartBoxAiFill />,
      title: "Dashboard",
    },
    {
      route: "/agent",
      component: <MdKeyboardVoice style={{ color: "white" }} />,
      title: "Agent",
    },
    { route: "/goals", component: <LuGoal />, title: "Goals" },
    { route: "/chat", component: <IoChatboxEllipses />, title: "Chat" },
    //     { route: "/logup", component: "Login/Sign Up" },
  ];
  return (
    <nav className="navbar">
      <ul className="navbar-list">
        {Path.map((e, ind) => (
          <li
            key={ind}
            className={
              "navbar-item" + (e.route === "/agent" ? " navbar-agent" : "")
            }
          >
            <Link to={e.route}>{e.component}</Link>
          </li>
        ))}
        <li className="navbar-agent-link">
          <Link to="/agent">
            <MdKeyboardVoice style={{ color: "white" }}/>
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
