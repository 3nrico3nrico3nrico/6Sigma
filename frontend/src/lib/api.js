import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

export const getAnalytes = () => api.get("/analytes").then((r) => r.data);
export const getRecords = () => api.get("/records").then((r) => r.data);
export const createRecord = (data) => api.post("/records", data).then((r) => r.data);
export const updateRecord = (id, data) => api.put(`/records/${id}`, data).then((r) => r.data);
export const deleteRecord = (id) => api.delete(`/records/${id}`).then((r) => r.data);
