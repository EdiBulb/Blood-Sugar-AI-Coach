// src/api/axios.js
import axios from "axios";

const apiClient = axios.create({
  baseURL: "https://blood-sugar-ai-coach.onrender.com",  // 🔁 여기에 너의 백엔드 Render 주소 넣어줘!
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;
