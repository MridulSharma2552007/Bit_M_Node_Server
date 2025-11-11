import express from "express";
import cors from "cors";
import { spawn } from "child_process";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => res.send("🎧 BITM Stream Server Running"));

app.get("/stream", async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).send("❌ Missing video id");

  console.log(`🎬 Streaming YouTube ID: ${id}`);

  // 1️⃣ Get direct audio link from yt-dlp
  const ytdlp = spawn("yt-dlp", [
    "-f", "bestaudio",
    "--no-playlist",
    "--no-warnings",
    "--quiet",
    "-g",
    `https://www.youtube.com/watch?v=${id}`,
  ]);

  let directUrl = "";

  for await (const chunk of ytdlp.stdout) {
    directUrl += chunk.toString();
  }

  directUrl = directUrl.trim();
  if (!directUrl) {
    console.error("❌ Failed to fetch direct URL");
    return res.status(500).send("Failed to get stream URL");
  }

  console.log("🎯 Direct audio URL:", directUrl);

  // 2️⃣ Use ffmpeg to stream to the client
  const ffmpeg = spawn("ffmpeg", [
    "-i", directUrl,
    "-f", "mp3",
    "-vn",
    "-acodec", "libmp3lame",
    "-b:a", "128k",
    "-content_type", "audio/mpeg",
    "pipe:1",
  ]);

  res.writeHead(200, {
    "Content-Type": "audio/mpeg",
    "Transfer-Encoding": "chunked",
    "Connection": "keep-alive",
  });

  ffmpeg.stdout.pipe(res);

  ffmpeg.on("close", () => {
    console.log(`✅ Stream ended for ${id}`);
    res.end();
  });

  req.on("close", () => {
    console.log("❌ Client disconnected");
    ffmpeg.kill("SIGKILL");
  });
});

app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
