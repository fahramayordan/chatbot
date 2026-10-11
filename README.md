# 🤖 AI Chatbot Asisten Cerdas - BATCH 32 (Hacktiv8)

Proyek Chatbot AI interaktif fullstack berbasis **Node.js**, **Express**, dan **Google Gemini API** (`@google/genai`) dengan antarmuka web modern bernuansa *dark mode glassmorphism*.

---

## 📌 Gambaran Proyek & Use Case

Proyek ini dibangun untuk memenuhi kriteria tugas pembuatan Chatbot berbasis AI pada Bootcamp Hacktiv8. Chatbot dirancang dengan fokus pada fleksibilitas multi-use-case dan kustomisasi parameter:

### 1. Pilihan Use Case & Persona
Pengguna dapat beralih persona secara dinamis hanya dengan satu klik:
* 💻 **Tech & Code Mentor (Default)**: Senior Software Engineer yang membantu penjelasan konsep pemrograman, debugging error, arsitektur kode, dan best practices.
* 🎓 **EduBot (Tutor Belajar)**: Tutor akademik yang menjelaskan konsep rumit menggunakan analogi sehari-hari yang mudah dipahami.
* ☕ **Teman Santai (Casual Bot)**: Teman ngobrol yang asyik, santai, dan luwes untuk percakapan sehari-hari.
* 🚀 **Career & Tech Coach**: Konsultan karier untuk persiapan CV, simulasi wawancara teknis/HR, dan portofolio developer.

### 2. Parameter Kreatif
* **Multi-Turn Chat Memory**: Bot mengingat konteks percakapan sebelumnya (*conversation history*).
* **Kontrol Kreativitas (Temperature Slider)**: Pengguna dapat mengatur tingkat ketepatan vs kreativitas model (0.0 Presisi hingga 1.0 Sangat Kreatif).
* **Multimodal Support (Upload Gambar / Screenshot)**: Pengguna dapat mengunggah gambar atau screenshot error kode untuk langsung dianalisis oleh Gemini via `multer`.
* **Kustomisasi System Prompt**: Pengguna dapat memasukkan instruksi tambahan khusus untuk bot.
* **Fitur Ekspor & Salin**: Dukungan salin kode dengan 1 klik dan ekspor riwayat obrolan ke format Markdown (`.md`).

---

## 🛠️ Tech Stack

* **Runtime**: Node.js (ES Modules)
* **Backend Framework**: Express.js 5
* **AI Model Engine**: Google Gemini API (`@google/genai` SDK)
* **File Upload**: Multer (In-memory buffer)
* **Frontend**: HTML5, Vanilla CSS (Glassmorphism & Responsive Layout), Vanilla JavaScript (ES6)
* **Markdown & Code Highlighting**: Marked.js & Highlight.js (Atom One Dark theme)

---

## 🚀 Cara Menjalankan Proyek Secara Lokal

### 1. Clone Repositori
```bash
git clone <URL_REPOSITORI_GITHUB_ANDA>
cd BATCH-32
```

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment (`.env`)
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Buka file `.env` dan masukkan API Key Google Gemini Anda:
```env
PORT=3000
GEMINI_API_KEY=masukkan_api_key_gemini_anda_di_sini
GEMINI_MODEL=gemini-2.5-flash
```
> 💡 *Catatan: Anda bisa mendapatkan API Key secara gratis di [Google AI Studio](https://aistudio.google.com/).*

### 4. Jalankan Server
Untuk mode produksi:
```bash
npm start
```
Atau untuk mode pengembangan (*auto-reload*):
```bash
npm run dev
```

### 5. Akses Aplikasi
Buka peramban (browser) Anda di:
```
http://localhost:3000
```

---

## 📂 Struktur Direktori Proyek

```
BATCH-32/
├── .env                  # Variabel lingkungan & API key (di-ignore dari git)
├── .env.example          # Template konfigurasi environment
├── .gitignore            # Mengabaikan node_modules dan .env
├── index.js              # Server Express.js & integrasi Gemini API
├── package.json          # Metadata dependensi proyek
├── README.md             # Dokumentasi proyek
└── public/               # Antarmuka Pengguna (Frontend)
    ├── index.html        # Halaman utama aplikasi
    ├── css/
    │   └── style.css     # Desain sistem & styling modern
    └── js/
        └── app.js        # Logika interaksi frontend & API fetch
```

---

## 📸 Deliverables

* **URL Repositori GitHub**: [Tautan GitHub Anda]
* **Screenshots UI**: *Tersedia tangkapan layar tampilan utama, obrolan dengan persona, serta mode upload gambar.*
