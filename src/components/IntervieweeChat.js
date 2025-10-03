import React, { useState, useEffect, useRef, useCallback } from "react";
import { Upload, Button, Input, message, Typography, Progress, Modal, Form } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import mammoth from "mammoth";

const { Dragger } = Upload;
const { Title, Text } = Typography;

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdn.jsdelivr.net/npm/pdfjs-dist@3.6.172/legacy/build/pdf.worker.min.js`;

const extractEmails = (text) => {
  const regex = /\b[A-Za-z0-9._%+-]+@[a-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const matches = text.match(regex);
  return matches ? matches[0] : "";
};

const extractPhone = (text) => {
  const regex = /\b(\+?91)?[\s.-]?\d{10}\b/g;
  const matches = text.match(regex);
  return matches ? matches[0] : "";
};

const extractName = (text) => {
  const nameLine = text.split("\n").find(line => /^Name[:\s]/i.test(line));
  if (nameLine) {
    const name = nameLine.split(":")[1]?.trim();
    if (name && name.split(" ").length >= 2) {
      return name;
    }
  }
  const lines = text.split('\n');
  for(let line of lines.slice(0, 5)) {
    line = line.trim();
    if (
      line.length > 1 &&
      !line.toLowerCase().includes("curriculum vitae") &&
      !line.toLowerCase().includes("resume") &&
      !line.includes("@") &&
      !/\d/.test(line) &&
      line.split(" ").length >= 2 &&
      !line.includes(",")
    ) {
      return line;
    }
  }
  return lines[0] || "";
};


const questions = [
  { id: 1, text: <span style={{ fontSize: '20px', fontWeight: 'bold' }}>What motivates you to apply for this position?</span>, level: "easy", time: 20 },
  { id: 2, text:  <span style={{ fontSize: '20px', fontWeight: 'bold' }}>Tell me about a challenging project you worked on?</span>, level: "easy", time: 20 },
  { id: 3, text:  <span style={{ fontSize: '20px', fontWeight: 'bold' }}> Explain polymorphism in OOP?</span>, level: "medium", time: 60 },
  { id: 4, text: <span style={{ fontSize: '20px', fontWeight: 'bold' }}> Describe a time you handled conflict in a team?</span>, level: "medium", time: 60 },
  { id: 5, text: <span style={{ fontSize: '20px', fontWeight: 'bold' }}> How would you optimize a complex algorithm?</span> , level: "hard", time: 120 },
  { id: 6, text:  <span style={{ fontSize: '20px', fontWeight: 'bold' }}>Where do you see the future of AI in your field?</span>, level: "hard", time: 120 },
];


const IntervieweeChat = () => {
  const [form] = Form.useForm();
  const [candidate, setCandidate] = useState(null);
  const [missingFields, setMissingFields] = useState([]);
  const [mode, setMode] = useState("UPLOAD");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const timerRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [welcomeModalVisible, setWelcomeModalVisible] = useState(false);

 const finishInterview = useCallback((answers) => {
  const score = answers.reduce((acc, a) => acc + (a ? 10 : 0), 0);
  const summary = `Final score: ${score}. Thank you for your time!`;
  const completedCandidate = { ...candidate, answers, score, summary };
  setCandidate(completedCandidate);
  setMode("DONE");
  setWelcomeModalVisible(true);
  message.success("Interview complete. Check interviewer dashboard.");
  const storedCandidates = JSON.parse(localStorage.getItem("candidates") || "[]");
  storedCandidates.push(completedCandidate);
  localStorage.setItem("candidates", JSON.stringify(storedCandidates));
}, [candidate]);


const handleSubmitAnswer = useCallback(() => {
  clearInterval(timerRef.current);
  const newAnswers = candidate.answers ? [...candidate.answers] : [];
  newAnswers[currentQuestionIndex] = answer.trim();
  setCandidate(prev => ({ ...prev, answers: newAnswers }));
  setAnswer("");
  if (currentQuestionIndex === questions.length - 1) {
    finishInterview(newAnswers);
  } else {
    setCurrentQuestionIndex(currentQuestionIndex + 1);
  }
}, [candidate, currentQuestionIndex, answer, finishInterview]);
 // Added finishInterview in dependencies


  const startTimer = useCallback(
    (seconds) => {
      setTimeLeft(seconds);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmitAnswer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [handleSubmitAnswer]
  );

  useEffect(() => {
    if (!candidate) {
      setMode("UPLOAD");
      setMissingFields([]);
      return;
    }
    const missing = ["name", "email", "phone"].filter((f) => !candidate[f]);
    setMissingFields(missing);
    if (candidate.answers?.length === questions.length) {
      setMode("DONE");
      setWelcomeModalVisible(false);
    } else if (missing.length > 0) {
      setMode("FILL_MISSING");
      setWelcomeModalVisible(false);
    } else {
      setMode("INTERVIEW");
      setWelcomeModalVisible(false);
    }
  }, [candidate]);

  useEffect(() => {
    if (mode === "INTERVIEW" && currentQuestionIndex < questions.length) {
      startTimer(questions[currentQuestionIndex].time);
    }
    return () => clearInterval(timerRef.current);
  }, [mode, currentQuestionIndex, startTimer]);



  const handleFileUpload = async (file) => {
    try {
      let text = "";
      if (file.type === "application/pdf") {
        const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
        let textContent = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          textContent += content.items.map(item => item.str).join("\n") + "\n";
        }
        text = textContent;
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else {
        message.error("Unsupported file type. Upload PDF or DOCX only.");
        return false;
      }
      const name = extractName(text);
      const email = extractEmails(text);
      const phone = extractPhone(text);
      setCandidate({ name, email, phone, answers: [], score: 0, summary: "" });
      message.success("Resume processed.");
      return false;
    } catch {
      message.error("Failed to parse file.");
      return false;
    }
  };

  const closeWelcomeModal = () => {
    setWelcomeModalVisible(false);
  };

  if (mode === "UPLOAD") {
    return (
        
      <div className="panel-container" style={{ padding: 20 }}>
         <Title className="dashboard-title">Interviewee Chat</Title>
        <Title level={3}>Upload your Resume (PDF or DOCX)</Title>
        <Dragger beforeUpload={handleFileUpload} multiple={false} accept=".pdf,.docx">
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Click or drag file to upload</p>
          <p className="ant-upload-hint">Only PDF or DOCX files accepted.</p>
        </Dragger>
      </div>
    );
  }

  if (mode === "FILL_MISSING") {
    return (
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          name: candidate?.name || "",
          email: candidate?.email || "",
          phone: candidate?.phone || "",
        }}
        className="panel-container"
        style={{ padding: 20 }}
        onFinish={() => {
          const values = form.getFieldsValue();
          const minPhoneLength = 10;
          if (values.phone && values.phone.replace(/\D/g, "").length < minPhoneLength) {
            message.error(`Phone number must be at least ${minPhoneLength} digits`);
            return;
          }
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (values.email && !emailRegex.test(values.email)) {
            message.error("Enter a valid email address");
            return;
          }
          setCandidate({ ...candidate, ...values });
          setMode("INTERVIEW");
        }}
      >
        <Title level={3}>Please fill in missing details</Title>
        {missingFields.includes("name") && (
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: "Please enter name" }]}
          >
            <Input placeholder="Enter name" />
          </Form.Item>
        )}
        {missingFields.includes("email") && (
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, message: "Please enter email" }]}
          >
            <Input placeholder="Enter email" type="email" />
          </Form.Item>
        )}
        {missingFields.includes("phone") && (
          <Form.Item
            name="phone"
            label="Phone Number"
            rules={[{ required: true, message: "Please enter phone number" }]}
          >
            <Input placeholder="Enter phone" />
          </Form.Item>
        )}
        <Button htmlType="submit" type="primary">
          Continue to Interview
        </Button>
      </Form>
    );
  }

  if (mode === "INTERVIEW" && currentQuestionIndex < questions.length) {
    const q = questions[currentQuestionIndex];
    return (
      <div className="panel-container" style={{ padding: 20 }}>
        <Title level={4}>
          Question {currentQuestionIndex + 1} of {questions.length} ({q.level})
        </Title>
        <Text>{q.text}</Text>
        <Input.TextArea
          rows={4}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer here"
          style={{ marginTop: 10 }}
        />
        <div style={{ marginTop: 10 }}>
          <Button type="primary" onClick={handleSubmitAnswer} disabled={!answer.trim()}>
            Submit Answer
          </Button>
          <Progress
            percent={(timeLeft / q.time) * 100}
            status={timeLeft === 0 ? "exception" : "normal"}
            strokeColor={{ "0%": "#108ee9", "100%": "#87d068" }}
            style={{ width: 300, marginLeft: 20, display: "inline-block" }}
          />
          <Text style={{ marginLeft: 10 }}>{timeLeft}s left</Text>
        </div>
      </div>
    );
  }

  if (mode === "DONE") {
    return (
      <div className="panel-container" style={{ padding: 20 }}>
        <Title level={3}>Interview Completed</Title>
        <Text>Name: {candidate?.name}</Text> <br />
        <Text>Email: {candidate?.email}</Text> <br />
        <Text>Phone: {candidate?.phone}</Text> <br />
        <Text>Score: {candidate?.score}</Text>
        <p>{candidate?.summary}</p>
        <Button
          type="primary"
          onClick={() => {
            localStorage.removeItem("candidateData");
            setCandidate(null);
            setMode("UPLOAD");
          }}
          style={{ marginTop: 20 }}
        >
          Start New Interview
        </Button>
        <Modal
          title="Welcome Back"
          open={welcomeModalVisible}
          onOk={closeWelcomeModal}
          cancelButtonProps={{ style: { display: "none" } }}
        >
          <p>Your interview session is complete. You may start a new interview.</p>
        </Modal>
      </div>
    );
  }

  return null;
};

export default IntervieweeChat;
