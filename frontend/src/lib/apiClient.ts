// src/services/apiClient.ts (inside frontend)
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

export const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  // const token = localStorage.getItem("accessToken"); // 👈 Get stored access token
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkMDBkYmEzNy05NjEyLTRiOWItOWFkYS0xZGRlNTFiOGQ1ZjciLCJpYXQiOjE3NDU2OTg0NTUsImV4cCI6MTc0NTc4NDg1NX0.Cg9d7oiGObVfB6vNlMapxUVzsZwalgUHdrKrtWyPZig"; // 👈 Replace with your method of getting the token

  const response = await axios.post(`${API_BASE_URL}/data-ingestion/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      "Authorization": `Bearer ${token}`,  // 👈 Include token
    },
  });

  return response.data;
};
