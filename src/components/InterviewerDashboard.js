import React, { useState, useEffect } from "react";
import { Input, Button, Modal, List, Typography } from "antd";

const { Title, Text } = Typography;

const InterviewerDashboard = () => {
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [detailCandidate, setDetailCandidate] = useState(null);

  useEffect(() => {
    const arr = JSON.parse(localStorage.getItem("candidates") || "[]");
    setCandidates(arr);
    setFilteredCandidates(arr);
  }, []);

  useEffect(() => {
    let arr = candidates;
    if (search) {
      arr = arr.filter((c) =>
        (c.name || "").toLowerCase().includes(search.toLowerCase())
      );
    }
    setFilteredCandidates(arr);
  }, [search, candidates]);

  const handleSort = () => {
    const sorted = [...filteredCandidates].sort((a, b) =>
      sortAsc ? a.score - b.score : b.score - a.score
    );
    setFilteredCandidates(sorted);
    setSortAsc(!sortAsc);
  };

  const handleDelete = (idx) => {
    const arr = [...candidates];
    arr.splice(idx, 1);
    setCandidates(arr);
    setFilteredCandidates(arr);
    localStorage.setItem("candidates", JSON.stringify(arr));
  };

  return (
    <div className="right-panel">
      <Title className="dashboard-title">Interviewer Dashboard</Title>
      <div className="search-bar">
        <Input
          placeholder="Search candidates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button className="sort-btn" onClick={handleSort}>
          Sort by score ({sortAsc ? "Asc" : "Desc"})
        </Button>
      </div>
      <List
        dataSource={filteredCandidates}
        renderItem={(candidate, idx) => (
          <div
            key={idx}
            className="candidate-card"
            style={{ cursor: "pointer" }}
          >
            <b
              style={{ fontSize: "18px" }}
              onClick={() => setDetailCandidate(candidate)}
            >
              {candidate.name || "Unknown"}
            </b>
            <Text>Email: {candidate.email || "N/A"}</Text>
            <Text>Phone: {candidate.phone || "N/A"}</Text>
            <Text>Score: {candidate.score}</Text>
            <Button className="delete-btn" onClick={() => handleDelete(idx)}>
              Delete
            </Button>
          </div>
        )}
      />
      <Modal
        open={!!detailCandidate}
        onCancel={() => setDetailCandidate(null)}
        onOk={() => setDetailCandidate(null)}
        title={detailCandidate?.name || "Candidate Details"}
        width={600}
        className="custom-modal"
      >
        {detailCandidate && (
          <div>
            <p><b>Email:</b> {detailCandidate.email}</p>
            <p><b>Phone:</b> {detailCandidate.phone}</p>
            <p><b>Score:</b> {detailCandidate.score}</p>
            <p><b>Summary:</b> {detailCandidate.summary}</p>
            <Title level={5}>Answers:</Title>
            <ul>
              {(detailCandidate.answers || []).map((a, i) => (
                <li key={i}>
                  <b>Q{i + 1}:</b> {a || "[No Answer]"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InterviewerDashboard;
