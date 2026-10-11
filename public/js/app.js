/* ==========================================================================
   BATCH-32 GEMINI AI CHATBOT - FRONTEND APPLICATION LOGIC
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const messagesContainer = document.getElementById("messagesContainer");
  const welcomeHero = document.getElementById("welcomeHero");
  const chatForm = document.getElementById("chatForm");
  const messageInput = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const attachBtn = document.getElementById("attachBtn");
  const imageInput = document.getElementById("imageInput");
  const attachmentPreview = document.getElementById("attachmentPreview");
  const previewImg = document.getElementById("previewImg");
  const previewFilename = document.getElementById("previewFilename");
  const removeAttachmentBtn = document.getElementById("removeAttachmentBtn");
  const typingIndicator = document.getElementById("typingIndicator");
  const charCounter = document.getElementById("charCounter");
  const toast = document.getElementById("toast");

  // Sidebar Elements
  const sidebar = document.getElementById("sidebar");
  const openSidebarBtn = document.getElementById("openSidebarBtn");
  const closeSidebarBtn = document.getElementById("closeSidebarBtn");
  const personaCards = document.querySelectorAll(".persona-card");
  const activePersonaName = document.getElementById("activePersonaName");
  const activePersonaEmoji = document.getElementById("activePersonaEmoji");
  const tempSlider = document.getElementById("tempSlider");
  const tempValueDisplay = document.getElementById("tempValueDisplay");
  const customPromptToggle = document.getElementById("customPromptToggle");
  const customPromptContainer = document.getElementById("customPromptContainer");
  const customPromptInput = document.getElementById("customPromptInput");
  const resetPromptBtn = document.getElementById("resetPromptBtn");
  const clearChatBtn = document.getElementById("clearChatBtn");
  const exportChatBtn = document.getElementById("exportChatBtn");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");
  const modelBadge = document.getElementById("modelBadge");

  // Application State
  let chatHistory = [];
  let currentPersona = "mentor";
  let currentTemperature = 0.7;
  let attachedFile = null;
  let isGenerating = false;

  const personaMeta = {
    mentor: { name: "Tech & Code Mentor", emoji: "💻" },
    edubot: { name: "EduBot (Tutor Belajar)", emoji: "🎓" },
    casual: { name: "Teman Santai", emoji: "☕" },
    career: { name: "Career & Tech Coach", emoji: "🚀" },
  };

  // Configure Marked.js for safe and beautiful markdown rendering
  if (typeof marked !== "undefined") {
    marked.setOptions({
      breaks: true,
      gfm: true,
      highlight: function (code, lang) {
        if (typeof hljs !== "undefined" && lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (e) {
            console.error(e);
          }
        }
        return code;
      },
    });
  }

  // ==========================================
  // INITIALIZATION & HEALTH CHECK
  // ==========================================

  async function checkServerHealth() {
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      if (data.success) {
        statusDot.className = "status-dot online pulse";
        statusText.textContent = "Server Online";
        if (data.defaultModel) {
          modelBadge.textContent = `${data.defaultModel} Ready`;
        }
      }
    } catch (err) {
      statusDot.className = "status-dot";
      statusText.textContent = "Offline / Disconnected";
      showToast("Gagal terhubung ke server Express.");
    }
  }

  // Load chat history from localStorage
  function loadLocalHistory() {
    try {
      const saved = localStorage.getItem("batch32_chat_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          chatHistory = parsed;
          welcomeHero.style.display = "none";
          chatHistory.forEach((msg) => renderMessageBubble(msg));
          scrollToBottom();
        }
      }
    } catch (e) {
      console.warn("Gagal membaca riwayat lokal:", e);
    }
  }

  function saveLocalHistory() {
    try {
      localStorage.setItem("batch32_chat_history", JSON.stringify(chatHistory));
    } catch (e) {
      console.warn("Gagal menyimpan riwayat lokal:", e);
    }
  }

  // ==========================================
  // EVENT LISTENERS: SIDEBAR & PARAMETERS
  // ==========================================

  // Mobile sidebar open/close
  if (openSidebarBtn) {
    openSidebarBtn.addEventListener("click", () => sidebar.classList.add("open"));
  }
  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener("click", () => sidebar.classList.remove("open"));
  }

  // Persona Selection
  personaCards.forEach((card) => {
    card.addEventListener("click", () => {
      personaCards.forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
      currentPersona = card.dataset.persona;

      const meta = personaMeta[currentPersona];
      if (meta) {
        activePersonaName.textContent = meta.name;
        activePersonaEmoji.textContent = meta.emoji;
      }
      showToast(`Persona diubah ke: ${meta?.name || currentPersona}`);
      if (window.innerWidth <= 900) {
        sidebar.classList.remove("open");
      }
    });
  });

  // Temperature Slider
  tempSlider.addEventListener("input", (e) => {
    currentTemperature = parseFloat(e.target.value);
    tempValueDisplay.textContent = currentTemperature.toFixed(1);
  });

  // Custom Prompt Accordion
  customPromptToggle.addEventListener("click", () => {
    customPromptToggle.classList.toggle("active");
    customPromptContainer.classList.toggle("show");
  });

  resetPromptBtn.addEventListener("click", () => {
    customPromptInput.value = "";
    showToast("System prompt dikembalikan ke default persona.");
  });

  // Clear Chat
  clearChatBtn.addEventListener("click", () => {
    if (confirm("Apakah Anda yakin ingin menghapus seluruh riwayat obrolan?")) {
      chatHistory = [];
      localStorage.removeItem("batch32_chat_history");
      messagesContainer.innerHTML = "";
      messagesContainer.appendChild(welcomeHero);
      welcomeHero.style.display = "flex";
      showToast("Riwayat obrolan telah dibersihkan.");
    }
  });

  // Export Chat
  exportChatBtn.addEventListener("click", () => {
    if (chatHistory.length === 0) {
      showToast("Belum ada obrolan untuk diekspor!");
      return;
    }

    let markdown = `# Percakapan Batch-32 Gemini AI\n`;
    markdown += `Tanggal: ${new Date().toLocaleString("id-ID")}\n`;
    markdown += `Persona: ${personaMeta[currentPersona]?.name || currentPersona}\n`;
    markdown += `Temperature: ${currentTemperature}\n\n---\n\n`;

    chatHistory.forEach((msg) => {
      const roleName = msg.role === "user" ? "Pengguna" : "Gemini AI";
      markdown += `### ${roleName} (${msg.timestamp || ""}):\n\n${msg.content}\n\n`;
    });

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Gemini-Chat-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Riwayat percakapan berhasil diunduh (.md)!");
  });

  // Suggestion Chips Click
  document.querySelectorAll(".suggestion-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const prompt = chip.dataset.prompt;
      if (prompt) {
        messageInput.value = prompt;
        sendMessage();
      }
    });
  });

  // ==========================================
  // INPUT & ATTACHMENT HANDLERS
  // ==========================================

  // Auto-resize textarea & character counter
  messageInput.addEventListener("input", () => {
    messageInput.style.height = "auto";
    messageInput.style.height = Math.min(messageInput.scrollHeight, 160) + "px";
    charCounter.textContent = `${messageInput.value.length} / 4000`;
  });

  // Keyboard shortcut: Enter to send, Shift+Enter for new line
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Attachment Button
  attachBtn.addEventListener("click", () => {
    imageInput.click();
  });

  // Image Selection
  imageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast("Ukuran gambar terlalu besar! Maksimal 10MB.");
        imageInput.value = "";
        return;
      }
      attachedFile = file;
      previewFilename.textContent = file.name;
      const reader = new FileReader();
      reader.onload = (event) => {
        previewImg.src = event.target.result;
        attachmentPreview.style.display = "block";
      };
      reader.readAsDataURL(file);
    }
  });

  // Remove Attachment
  removeAttachmentBtn.addEventListener("click", () => {
    clearAttachment();
  });

  function clearAttachment() {
    attachedFile = null;
    imageInput.value = "";
    previewImg.src = "";
    attachmentPreview.style.display = "none";
  }

  // Form submit
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage();
  });

  // ==========================================
  // SEND MESSAGE & API INTERACTION
  // ==========================================

  async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text && !attachedFile) return;
    if (isGenerating) return;

    // Sembunyikan welcome hero jika aktif
    welcomeHero.style.display = "none";

    // Simpan data file lokal untuk preview pesan
    let localImageSrc = null;
    if (attachedFile) {
      localImageSrc = previewImg.src;
    }

    const userMessageObj = {
      role: "user",
      content: text,
      imageSrc: localImageSrc,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Tambahkan ke riwayat & render bubble pengguna
    chatHistory.push(userMessageObj);
    renderMessageBubble(userMessageObj);
    saveLocalHistory();
    scrollToBottom();

    // Reset input form
    const currentAttachment = attachedFile;
    messageInput.value = "";
    messageInput.style.height = "auto";
    charCounter.textContent = "0 / 4000";
    clearAttachment();

    // Set state generating
    isGenerating = true;
    sendBtn.disabled = true;
    typingIndicator.style.display = "flex";
    scrollToBottom();

    try {
      // Siapkan FormData untuk POST ke backend Express
      const formData = new FormData();
      formData.append("message", text);
      formData.append("persona", currentPersona);
      formData.append("temperature", currentTemperature);
      formData.append("customSystemPrompt", customPromptInput.value.trim());

      // Kirim riwayat obrolan (tanpa blob gambar lokal agar payload ringan)
      const cleanHistory = chatHistory.slice(0, -1).map((item) => ({
        role: item.role,
        content: item.content,
      }));
      formData.append("history", JSON.stringify(cleanHistory));

      if (currentAttachment) {
        formData.append("image", currentAttachment);
      }

      // Panggil endpoint Express
      const response = await fetch("/api/chat", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Gagal mendapatkan respons dari server.");
      }

      // Respons sukses dari Gemini
      const botMessageObj = {
        role: "model",
        content: data.reply,
        modelUsed: data.modelUsed,
        persona: data.persona,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      chatHistory.push(botMessageObj);
      renderMessageBubble(botMessageObj);
      saveLocalHistory();
    } catch (err) {
      console.error("Chat error:", err);
      // Tampilkan bubble error yang jelas
      const errorMessageObj = {
        role: "model",
        isError: true,
        content: `⚠️ **Terjadi Kesalahan:**\n${err.message}\n\n*Tips: Pastikan koneksi internet stabil dan kunci API Gemini di file \`.env\` sudah aktif.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      renderMessageBubble(errorMessageObj);
    } finally {
      isGenerating = false;
      sendBtn.disabled = false;
      typingIndicator.style.display = "none";
      scrollToBottom();
    }
  }

  // ==========================================
  // RENDER MESSAGE BUBBLE
  // ==========================================

  function renderMessageBubble(msg) {
    const isUser = msg.role === "user";
    const row = document.createElement("div");
    row.className = `message-row ${isUser ? "user" : "assistant"}`;

    // Avatar
    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    if (isUser) {
      avatar.innerHTML = `<i class="fa-solid fa-user"></i>`;
    } else {
      const emoji = personaMeta[currentPersona]?.emoji || "🤖";
      avatar.textContent = emoji;
    }

    // Wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "message-content-wrapper";

    // Bubble
    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    // Gambar lampiran jika ada
    if (msg.imageSrc) {
      const img = document.createElement("img");
      img.src = msg.imageSrc;
      img.alt = "Gambar yang diunggah";
      img.className = "message-image-attachment";
      bubble.appendChild(img);
    }

    // Konten teks
    const textContentDiv = document.createElement("div");
    textContentDiv.className = "bubble-text";

    if (isUser) {
      // Escape HTML sederhana untuk pesan user
      textContentDiv.textContent = msg.content;
    } else {
      // Format Markdown untuk bot
      if (typeof marked !== "undefined") {
        textContentDiv.innerHTML = marked.parse(msg.content);
      } else {
        textContentDiv.textContent = msg.content;
      }
    }
    bubble.appendChild(textContentDiv);

    // Meta (Waktu & Tombol Salin)
    const meta = document.createElement("div");
    meta.className = "message-meta";

    const timeSpan = document.createElement("span");
    timeSpan.textContent = msg.timestamp || "";
    meta.appendChild(timeSpan);

    if (!isUser) {
      if (msg.modelUsed) {
        const modelSpan = document.createElement("span");
        modelSpan.textContent = `• ${msg.modelUsed}`;
        meta.appendChild(modelSpan);
      }

      const copyBtn = document.createElement("button");
      copyBtn.className = "copy-btn";
      copyBtn.innerHTML = `<i class="fa-regular fa-copy"></i> Salin`;
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(msg.content).then(() => {
          copyBtn.innerHTML = `<i class="fa-solid fa-check"></i> Tersalin!`;
          setTimeout(() => {
            copyBtn.innerHTML = `<i class="fa-regular fa-copy"></i> Salin`;
          }, 2000);
          showToast("Teks berhasil disalin ke clipboard!");
        });
      });
      meta.appendChild(copyBtn);
    }

    wrapper.appendChild(bubble);
    wrapper.appendChild(meta);

    row.appendChild(avatar);
    row.appendChild(wrapper);

    messagesContainer.appendChild(row);

    // Highlight code blocks
    if (!isUser && typeof hljs !== "undefined") {
      bubble.querySelectorAll("pre code").forEach((block) => {
        hljs.highlightElement(block);
      });
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 50);
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3200);
  }

  // Initial Run
  checkServerHealth();
  loadLocalHistory();
});
