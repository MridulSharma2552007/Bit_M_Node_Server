import express from "express";
import cors from "cors";
import { spawn } from "child_process";

const app = express();
app.use(cors());
const PORT = 3000;

app.get("/", (req, res) => res.send("🎧 BITM Stream Server Running"));

app.get("/stream", async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).send("❌ Missing video id");

  console.log(`🎬 Streaming YouTube ID: ${id}`);

  // ✅ Prepare yt-dlp first (prefetch manifest)
  const ytdlp = spawn("yt-dlp", [
    "-f", "bestaudio",
    "--no-playlist",
    "--no-warnings",
    "--quiet",
    "--socket-timeout", "30",
    "-g", // get direct URL
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

  // ✅ Now stream directly from YouTube using ffmpeg (so it’s a valid audio stream)
  const ffmpeg = spawn("ffmpeg", [
    "-i", directUrl,
    "-f", "mp3",
    "-vn",
    "-acodec", "libmp3lame",
    "-b:a", "192k",
    "-content_type", "audio/mpeg",
    "pipe:1",
  ]);

  res.writeHead(200, {
    "Content-Type": "audio/mpeg",
    "Transfer-Encoding": "chunked",
    "Connection": "keep-alive",
  });

  ffmpeg.stdout.pipe(res);

  ffmpeg.stderr.on("data", (data) => {
    // Comment this out if it floods your terminal
    // console.log("ffmpeg:", data.toString());
  });

  ffmpeg.on("close", (code) => {
    console.log(`✅ Stream ended (code ${code})`);
    res.end();
  });

  req.on("close", () => {
    console.log("❌ Client disconnected");
    ffmpeg.kill("SIGKILL");
  });
});

app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
