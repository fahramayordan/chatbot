import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Multer memory storage for handling image attachments
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Hanya file gambar (JPG, PNG, WebP, GIF) yang didukung!"), false);
    }
  },
});

// Setup Google Gen AI SDK client
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!apiKey || apiKey.includes("your_gemini_api_key")) {
  console.warn("⚠️ PERINGATAN: API Key Gemini belum disetel dengan benar di file .env!");
  console.warn("Silakan perbarui GEMINI_API_KEY di file .env Anda.");
}

const ai = new GoogleGenAI({ apiKey });

// Daftar Persona Kreatif
export const PERSONAS = {
  mentor: {
    id: "mentor",
    name: "Tech & Code Mentor",
    icon: "💻",
    description: "Senior Software Engineer yang ramah, solutif, dan ahli dalam coding & debugging.",
    tone: "Edukasi & Ramah",
    systemPrompt: `Kamu adalah 'Tech & Code Mentor', seorang Senior Fullstack Engineer dan instruktur yang sangat suportif dan berpengalaman.
Tugas utamamu adalah membantu pengguna memahami konsep pemrograman, arsitektur software, debugging error, dan best practices dalam coding (JavaScript, Node.js, Express, database, frontend, dll).
Gaya bicaramu ramah, profesional, mudah dipahami pemula namun tetap berbobot untuk level lanjutan.
Selalu sertakan penjelasan ringkas, tips praktis, dan contoh kode yang rapi dengan komentar jika relevan.
Gunakan format Markdown (bold, bullet points, code blocks) agar jawaban mudah dibaca.`,
  },
  edubot: {
    id: "edubot",
    name: "EduBot (Tutor Belajar)",
    icon: "🎓",
    description: "Tutor akademik yang sabar dan menjelaskan konsep dari dasar dengan analogi mudah.",
    tone: "Akademik & Menjelaskan",
    systemPrompt: `Kamu adalah 'EduBot', asisten belajar cerdas yang membantu pengguna memahami topik edukasi dan sains.
Gunakan analogi sehari-hari yang intuitif saat menjelaskan konsep sulit.
Dorong pengguna untuk berpikir kritis dan berikan pertanyaan tindak lanjut yang memancing rasa ingin tahu.
Gunakan bahasa Indonesia yang runtut, sopan, dan terstruktur dengan rapi.`,
  },
  casual: {
    id: "casual",
    name: "Teman Santai (Casual Bot)",
    icon: "☕",
    description: "Teman ngobrol yang asyik, gaul, santai, dan seru diajak curhat atau diskusi ringan.",
    tone: "Santai & Gaul",
    systemPrompt: `Kamu adalah 'Teman Santai', asisten dengan persona sahabat dekat yang seru, hangat, dan santai.
Gaya bahasamu kasual, luwes, menggunakan bahasa sehari-hari yang wajar, humoris jika sesuai, dan tidak kaku seperti robot resmi.
Tetap bermanfaat dan cerdas dalam memberikan saran atau obrolan santai.`,
  },
  career: {
    id: "career",
    name: "Career & Tech Coach",
    icon: "🚀",
    description: "Konsultan karier industri teknologi untuk persiapan CV, portofolio, dan interview kerja.",
    tone: "Profesional & Strategis",
    systemPrompt: `Kamu adalah 'Career & Tech Coach', konsultan karier profesional di industri teknologi.
Bantu pengguna dalam menyusun CV ATS-friendly, simulasi wawancara teknis/HR, strategi membangun portofolio proyek, dan pengembangan soft skills.
Berikan feedback konstruktif, terstruktur, dan actionable (langsung bisa diterapkan).`,
  },
};

// Endpoint untuk daftar Persona
app.get("/api/personas", (req, res) => {
  res.json({
    success: true,
    data: Object.values(PERSONAS),
  });
});

// Endpoint Health Check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "online",
    message: "Server Chatbot Batch-32 siap menerima permintaan!",
    apiKeyConfigured: Boolean(apiKey && !apiKey.includes("your_gemini_api_key")),
    defaultModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  });
});

// Helper untuk memanggil Gemini dengan model fallback yang tangguh
async function generateWithGemini({ contents, systemInstruction, temperature }) {
  // Model kandidat berurutan
  const candidateModels = [
    process.env.GEMINI_MODEL,
    "gemini-2.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.7-flash",
    "gemini-1.5-flash",
  ].filter(Boolean);

  // Hindari duplikat
  const uniqueModels = [...new Set(candidateModels)];

  let lastError = null;

  for (const model of uniqueModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: typeof temperature === "number" ? temperature : 0.7,
        },
      });

      if (response && response.text) {
        return {
          text: response.text,
          modelUsed: model,
        };
      }
    } catch (err) {
      console.warn(`[Gemini API] Percobaan model ${model} gagal:`, err.message);
      lastError = err;
      // Jika error adalah kuota / not found, coba model berikutnya
      continue;
    }
  }

  throw lastError || new Error("Gagal mendapatkan respons dari semua model Gemini.");
}

// Endpoint Chatbot Utama
app.post("/api/chat", upload.single("image"), async (req, res) => {
  try {
    const {
      message = "",
      persona = "mentor",
      temperature = 0.7,
      history = "[]",
      customSystemPrompt = "",
    } = req.body;

    // Validasi input
    if (!message.trim() && !req.file) {
      return res.status(400).json({
        success: false,
        error: "Pesan teks atau gambar wajib diisi!",
      });
    }

    // Parsing riwayat obrolan (multi-turn conversation memory)
    let parsedHistory = [];
    try {
      parsedHistory = typeof history === "string" ? JSON.parse(history) : history;
    } catch {
      parsedHistory = [];
    }

    // Tentukan persona dan system prompt
    const selectedPersona = PERSONAS[persona] || PERSONAS.mentor;
    const activeSystemPrompt = customSystemPrompt?.trim()
      ? customSystemPrompt
      : selectedPersona.systemPrompt;

    // Bangun array 'contents' sesuai struktur API Gemini
    const geminiContents = [];

    // Tambahkan riwayat obrolan sebelumnya untuk mempertahankan konteks memori
    if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
      // Ambil maksimal 12 turn percakapan terakhir agar tidak melebihi konteks berlebih
      const recentHistory = parsedHistory.slice(-12);

      for (const item of recentHistory) {
        if (!item || !item.content) continue;
        const role = item.role === "assistant" || item.role === "model" ? "model" : "user";
        geminiContents.push({
          role,
          parts: [{ text: String(item.content) }],
        });
      }
    }

    // Bangun bagian untuk pesan saat ini (Current turn)
    const currentParts = [];

    // Jika ada gambar terlampir (Multimodal support via Multer)
    if (req.file) {
      currentParts.push({
        inlineData: {
          mimeType: req.file.mimetype,
          data: req.file.buffer.toString("base64"),
        },
      });
    }

    // Tambahkan teks pesan
    if (message.trim()) {
      currentParts.push({ text: message.trim() });
    } else if (req.file) {
      currentParts.push({ text: "Tolong analisis dan jelaskan gambar ini secara detail." });
    }

    geminiContents.push({
      role: "user",
      parts: currentParts,
    });

    // Panggil model Gemini
    const tempValue = Math.min(Math.max(parseFloat(temperature) || 0.7, 0.0), 1.0);
    const result = await generateWithGemini({
      contents: geminiContents,
      systemInstruction: activeSystemPrompt,
      temperature: tempValue,
    });

    return res.json({
      success: true,
      reply: result.text,
      modelUsed: result.modelUsed,
      persona: selectedPersona.name,
    });
  } catch (error) {
    console.error("Error pada endpoint /api/chat:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Terjadi kesalahan saat menghubungi Google Gemini API.",
      hint: "Pastikan API Key di file .env sudah valid dan kuota akun aktif.",
    });
  }
});

// Default fallback untuk Single Page App (Express 5 compatible)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🤖 Chatbot AI BATCH-32 Server Berjalan!`);
  console.log(`🌐 Akses antarmuka di: http://localhost:${PORT}`);
  console.log(`🔑 Status API Key: ${apiKey ? "Terdeteksi" : "Belum diisi"}`);
  console.log(`===============================================`);
});