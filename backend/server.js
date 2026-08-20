import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import playerRoutes from "./src/routes/player.route.js";
import authRoutes from "./src/routes/auth.route.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api", playerRoutes);
app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Server Backend đang chạy tại http://localhost:${PORT}`);
});
