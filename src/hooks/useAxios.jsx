import axios from "axios";

const useAxios = () => {
  const instance = axios.create({
    baseURL: "http://localhost:5000/api",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return instance;
};

export default useAxios;