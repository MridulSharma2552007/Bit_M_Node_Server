import express from "express";
import cors from "cors";
import { spawn } from "child_process";

const app = express();
app.use(cors());
const PORT = 3000;

app.get("/url", async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).send("Missing id");

  console.log(`🎬 Request received for ID: ${id}`);

  const ytdlp = spawn("yt-dlp", [
    "-f", "bestaudio",
    "-g",
    `https://www.youtube.com/watch?v=${id}`,
  ]);

  let directUrl = "";

  for await (const chunk of ytdlp.stdout) {
    directUrl += chunk.toString();
  }

  directUrl = directUrl.trim();

  if (!directUrl) {
    console.log("❌ Failed to fetch URL");
    return res.json({ url: null });
  }

  console.log(`🔗 Direct URL generated: ${directUrl}`);

  res.json({ url: directUrl });
});

app.listen(PORT,"0.0.0.0", () => console.log("✔️ URL Server running on 3000"));
