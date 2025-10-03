
import React, { useState, useEffect } from "react";
import { Modal } from "antd"; // Removed Tabs import
import IntervieweeChat from "./components/IntervieweeChat";
import InterviewerDashboard from "./components/InterviewerDashboard";
import './App.css';

const App = () => {
  const [welcomeModalVisible, setWelcomeModalVisible] = useState(false);

  useEffect(() => {
    const lastSession = localStorage.getItem("lastSessionTimestamp");
    if (lastSession) {
      setWelcomeModalVisible(true);
    }
  }, []);

  return (
    <>
      <div className="app-container">
        <div className="interviewee-chat">
          <IntervieweeChat />
        </div>
        <div className="interviewer-dashboard">
          <InterviewerDashboard />
        </div>
      </div>

      <Modal
        title="Welcome Back"
        open={welcomeModalVisible}
        onOk={() => {
          setWelcomeModalVisible(false);
          localStorage.setItem("lastSessionTimestamp", Date.now());
        }}
        cancelButtonProps={{ style: { display: "none" } }}
      >
        <p>Welcome back! Your previous session data is restored.</p>
      </Modal>
    </>
  );
};

export default App;
