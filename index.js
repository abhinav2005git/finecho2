import "dotenv/config";
import axios from "axios";

console.log("Backend started");
console.log("Base URL:", process.env.BACKBOARD_BASE_URL);


async function listThreads() {
  try {
    const res = await axios.get(
      `${process.env.BACKBOARD_BASE_URL}/v1/threads?limit=10`,
      {
        headers: {
          Authorization: `Bearer ${process.env.BACKBOARD_API_KEY}`,
        },
        timeout: 10000,
      }
    );

    console.log("Connected to Backboard API ✅");
    console.log(JSON.stringify(res.data, null, 2));
  } catch (error) {
    console.error("Backboard API call failed ❌");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error("Error:", error.message);
    }
  }
}

listThreads();
