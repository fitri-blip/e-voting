import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const DATA_FILE = path.join(process.cwd(), 'data.json');
  const UPLOADS_DIR = path.join(process.cwd(), 'public', 'candidates');

  // Ensure candidates directory exists
  await fs.ensureDir(UPLOADS_DIR);

  app.use(express.json({ limit: '10mb' }));

  // Helper to read/write data
  const readData = async () => {
    if (await fs.pathExists(DATA_FILE)) {
      return await fs.readJson(DATA_FILE);
    }
    return { pemilihList: [], kandidatList: [], users: [] };
  };

  const saveData = async (data: any) => {
    await fs.writeJson(DATA_FILE, data);
  };

  // API Routes
  app.post("/api/upload-image", async (req, res) => {
    try {
      const { image, name } = req.body;
      if (!image) return res.status(400).json({ error: "No image provided" });

      // image is a base64 string: data:image/png;base64,xxxx
      const matches = image.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: "Invalid image format" });
      }

      const rawExt = matches[1]; // e.g. "png" or "jpeg"
      const extension = rawExt === 'jpeg' ? 'jpg' : rawExt;
      const buffer = Buffer.from(matches[2], 'base64');
      const filename = `${Date.now()}-${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${extension}`;
      const filepath = path.join(UPLOADS_DIR, filename);

      await fs.writeFile(filepath, buffer);
      res.json({ url: `/candidates/${filename}` });
    } catch (e) {
      console.error("Upload error:", e);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  app.get("/api/voting-data", async (req, res) => {
    const data = await readData();
    res.json(data);
  });

  app.post("/api/voting-data", async (req, res) => {
    await saveData(req.body);
    res.json({ success: true });
  });

  // Serve candidates folder
  app.use('/candidates', express.static(UPLOADS_DIR));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
