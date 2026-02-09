import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { ObjectStorageService, objectStorageClient } from "./replit_integrations/object_storage/objectStorage";
import { detectCategory } from "@shared/schema";

const objectStorage = new ObjectStorageService();

interface TrimInput {
  mediaId: number;
  trimStart: number;
  trimEnd: number;
  title?: string;
}

interface MergeInput {
  mediaIds: number[];
  title?: string;
}

function parseObjectPath(objectPath: string): { bucketName: string; objectName: string } {
  let entityDir = objectStorage.getPrivateObjectDir();
  if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;

  if (objectPath.startsWith("/objects/")) {
    const entityId = objectPath.slice("/objects/".length);
    const fullPath = `${entityDir}${entityId}`;
    const parts = fullPath.startsWith("/") ? fullPath.slice(1).split("/") : fullPath.split("/");
    return { bucketName: parts[0], objectName: parts.slice(1).join("/") };
  }

  const p = objectPath.startsWith("/") ? objectPath.slice(1) : objectPath;
  const parts = p.split("/");
  return { bucketName: parts[0], objectName: parts.slice(1).join("/") };
}

async function downloadToTemp(objectPath: string, tmpDir: string, filename: string): Promise<string> {
  const { bucketName, objectName } = parseObjectPath(objectPath);
  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);
  const destPath = path.join(tmpDir, filename);
  await file.download({ destination: destPath });
  return destPath;
}

async function uploadFromFile(localPath: string, contentType: string): Promise<{ objectPath: string; size: number }> {
  let entityDir = objectStorage.getPrivateObjectDir();
  if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;
  const objectId = randomUUID();
  const fullPath = `${entityDir}uploads/${objectId}`;
  const { bucketName, objectName } = (() => {
    const p = fullPath.startsWith("/") ? fullPath.slice(1) : fullPath;
    const parts = p.split("/");
    return { bucketName: parts[0], objectName: parts.slice(1).join("/") };
  })();

  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);
  await file.save(await fs.readFile(localPath), { contentType });

  const stat = await fs.stat(localPath);
  return { objectPath: `/objects/uploads/${objectId}`, size: stat.size };
}

function runFFmpeg(args: string[], onProgress?: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["pipe", "pipe", "pipe"] });
    let stderr = "";

    proc.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      if (onProgress) {
        const match = text.match(/time=(\d+):(\d+):(\d+)\.(\d+)/);
        if (match) {
          const hours = parseInt(match[1]);
          const mins = parseInt(match[2]);
          const secs = parseInt(match[3]);
          const timeInSec = hours * 3600 + mins * 60 + secs;
          onProgress(timeInSec);
        }
      }
    });

    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`));
    });

    proc.on("error", (err) => reject(err));
  });
}

function runFFprobe(filePath: string): Promise<{ duration: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffprobe", [
      "-v", "quiet",
      "-print_format", "json",
      "-show_format",
      filePath,
    ]);
    let stdout = "";
    proc.stdout?.on("data", (data: Buffer) => { stdout += data.toString(); });
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error("ffprobe failed"));
      try {
        const info = JSON.parse(stdout);
        resolve({ duration: parseFloat(info.format?.duration || "0") });
      } catch { reject(new Error("ffprobe parse error")); }
    });
    proc.on("error", reject);
  });
}

async function generateThumbnail(videoPath: string, tmpDir: string, timeOffset: number = 1): Promise<string> {
  const thumbPath = path.join(tmpDir, "thumb.jpg");
  await runFFmpeg([
    "-y", "-ss", String(Math.min(timeOffset, 1)), "-i", videoPath,
    "-frames:v", "1", "-q:v", "5", "-vf", "scale=320:-1",
    thumbPath,
  ]);
  return thumbPath;
}

export async function processTrimJob(jobId: number) {
  let tmpDir = "";
  try {
    const job = await storage.getProcessingJob(jobId);
    if (!job) throw new Error("Job not found");

    const input: TrimInput = JSON.parse(job.inputData);
    const mediaItem = await storage.getMediaItem(input.mediaId);
    if (!mediaItem) throw new Error("Source media not found");

    await storage.updateProcessingJob(jobId, { status: "downloading", progress: 10 });

    tmpDir = path.join(os.tmpdir(), `video-proc-${jobId}`);
    await fs.mkdir(tmpDir, { recursive: true });

    const ext = path.extname(mediaItem.filename || "video.mp4") || ".mp4";
    const inputPath = await downloadToTemp(mediaItem.url, tmpDir, `input${ext}`);

    await storage.updateProcessingJob(jobId, { status: "processing", progress: 30 });

    const outputPath = path.join(tmpDir, "output.mp4");
    const clipDuration = input.trimEnd - input.trimStart;

    await runFFmpeg([
      "-y",
      "-i", inputPath,
      "-ss", String(input.trimStart),
      "-to", String(input.trimEnd),
      "-c:v", "libx264", "-preset", "fast", "-crf", "23",
      "-c:a", "aac", "-b:a", "128k",
      "-movflags", "+faststart",
      outputPath,
    ], (timeInSec) => {
      const pct = Math.min(90, 30 + Math.round((timeInSec / clipDuration) * 60));
      storage.updateProcessingJob(jobId, { progress: pct });
    });

    await storage.updateProcessingJob(jobId, { status: "uploading", progress: 90 });

    const { objectPath, size } = await uploadFromFile(outputPath, "video/mp4");

    let thumbnailUrl: string | undefined;
    try {
      const thumbLocalPath = await generateThumbnail(outputPath, tmpDir);
      const thumbResult = await uploadFromFile(thumbLocalPath, "image/jpeg");
      thumbnailUrl = thumbResult.objectPath;
    } catch {}

    const probeResult = await runFFprobe(outputPath).catch(() => ({ duration: Math.round(clipDuration) }));

    const title = input.title || `${mediaItem.title} (trimmed)`;
    const newMedia = await storage.createMediaItem({
      title,
      description: `Trimmed from ${mediaItem.title}: ${formatTime(input.trimStart)} - ${formatTime(input.trimEnd)}`,
      url: objectPath,
      filename: `${title.replace(/[^a-zA-Z0-9]/g, "_")}.mp4`,
      contentType: "video/mp4",
      category: "video",
      size,
      tags: [...(mediaItem.tags || []), "trimmed"],
      label: mediaItem.label || undefined,
      artist: mediaItem.artist || undefined,
      venue: mediaItem.venue || undefined,
      tour: mediaItem.tour || undefined,
      thumbnailUrl,
      durationSeconds: Math.round(probeResult.duration),
    });

    await storage.updateProcessingJob(jobId, { status: "complete", progress: 100, outputMediaId: newMedia.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[VideoProcessor] Trim job ${jobId} failed:`, msg);
    await storage.updateProcessingJob(jobId, { status: "failed", errorMessage: msg });
  } finally {
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function processMergeJob(jobId: number) {
  let tmpDir = "";
  try {
    const job = await storage.getProcessingJob(jobId);
    if (!job) throw new Error("Job not found");

    const input: MergeInput = JSON.parse(job.inputData);
    if (!input.mediaIds || input.mediaIds.length < 2) throw new Error("Need at least 2 videos to merge");

    const mediaItems_list = [];
    for (const id of input.mediaIds) {
      const item = await storage.getMediaItem(id);
      if (!item) throw new Error(`Media item ${id} not found`);
      mediaItems_list.push(item);
    }

    await storage.updateProcessingJob(jobId, { status: "downloading", progress: 5 });

    tmpDir = path.join(os.tmpdir(), `video-merge-${jobId}`);
    await fs.mkdir(tmpDir, { recursive: true });

    const normalizedPaths: string[] = [];
    for (let i = 0; i < mediaItems_list.length; i++) {
      const item = mediaItems_list[i];
      const ext = path.extname(item.filename || "video.mp4") || ".mp4";
      const dlPath = await downloadToTemp(item.url, tmpDir, `input_${i}${ext}`);
      const pct = 5 + Math.round((i / mediaItems_list.length) * 20);
      await storage.updateProcessingJob(jobId, { progress: pct });

      const normalizedPath = path.join(tmpDir, `norm_${i}.mp4`);
      await runFFmpeg([
        "-y", "-i", dlPath,
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2",
        "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2",
        "-r", "30",
        "-movflags", "+faststart",
        normalizedPath,
      ]);
      normalizedPaths.push(normalizedPath);
      const normPct = 25 + Math.round((i / mediaItems_list.length) * 30);
      await storage.updateProcessingJob(jobId, { progress: normPct });
    }

    await storage.updateProcessingJob(jobId, { status: "processing", progress: 60 });

    const concatListPath = path.join(tmpDir, "concat.txt");
    const concatContent = normalizedPaths.map(p => `file '${p}'`).join("\n");
    await fs.writeFile(concatListPath, concatContent);

    const outputPath = path.join(tmpDir, "merged.mp4");
    await runFFmpeg([
      "-y",
      "-f", "concat", "-safe", "0",
      "-i", concatListPath,
      "-c", "copy",
      "-movflags", "+faststart",
      outputPath,
    ]);

    await storage.updateProcessingJob(jobId, { status: "uploading", progress: 85 });

    const { objectPath, size } = await uploadFromFile(outputPath, "video/mp4");

    let thumbnailUrl: string | undefined;
    try {
      const thumbLocalPath = await generateThumbnail(outputPath, tmpDir);
      const thumbResult = await uploadFromFile(thumbLocalPath, "image/jpeg");
      thumbnailUrl = thumbResult.objectPath;
    } catch {}

    const probeResult = await runFFprobe(outputPath).catch(() => ({ duration: 0 }));

    const title = input.title || `Merged Video (${mediaItems_list.length} clips)`;
    const sourceNames = mediaItems_list.map(m => m.title).join(", ");
    const newMedia = await storage.createMediaItem({
      title,
      description: `Combined from: ${sourceNames}`,
      url: objectPath,
      filename: `${title.replace(/[^a-zA-Z0-9]/g, "_")}.mp4`,
      contentType: "video/mp4",
      category: "video",
      size,
      tags: ["merged"],
      thumbnailUrl,
      durationSeconds: Math.round(probeResult.duration),
    });

    await storage.updateProcessingJob(jobId, { status: "complete", progress: 100, outputMediaId: newMedia.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[VideoProcessor] Merge job ${jobId} failed:`, msg);
    await storage.updateProcessingJob(jobId, { status: "failed", errorMessage: msg });
  } finally {
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
