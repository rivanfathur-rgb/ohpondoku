console.log("🚀 BOT SEDANG INITIALIZING...");
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const TOKEN = process.env.TELEGRAM_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const ADMIN_ID = process.env.ADMIN_ID;
const SERPER_API_KEY = process.env.SERPER_API_KEY; // Tambahkan key ini di Railway

let offset = 0;
let lastDraft = "";
let pendingImage = false;
let imageUrl = "";

// ==========================================
// FUNGSI SEARCH GOOGLE (SERPER.DEV)
// ==========================================
async function cariDiGoogle(query) {
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        q: query, 
        gl: "id",
        hl: "id" 
      }) 
    });
    const data = await res.json();
    
    if (!data.organic || data.organic.length === 0) {
      return "Tidak ditemukan informasi di internet.";
    }

    // Mengambil snippet dari Google agar AI tahu fakta aslinya
    return data.organic
      .slice(0, 5)
      .map(item => `Sumber: ${item.title}\nDetail: ${item.snippet}`)
      .join("\n\n");
  } catch (err) {
    console.log("Serper Error:", err);
    return "Gagal mengambil data internet.";
  }
}

// =======================
// AMBIL UPDATE TELEGRAM
// =======================
async function getUpdates() {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/getUpdates?offset=${offset}`);
    const data = await res.json();

    if (!data.ok) {
      console.log("❌ Telegram error:", data);
      return;
    }

    if (!Array.isArray(data.result)) return;

    for (const update of data.result) {
      offset = update.update_id + 1;

      const msg = update.message;
      if (!msg) continue;

      const chatId = msg.chat.id;
      const text = msg.text || "";

      if (chatId.toString() !== ADMIN_ID.toString()) {
        await sendMessage(chatId, "❌ Akses ditolak");
        continue;
      }

      // TES
      if (text === "tes") {
        await sendMessage(chatId, "✅ bot nyala");
      }

      // CARI AI (DENGAN GOOGLE SEARCH)
      else if (text.startsWith("Cari:")) {
        const query = text.replace("Cari:", "").trim();

        await sendMessage(chatId, `🔍 Sedang mencari fakta internet tentang "${query}"...`);

        try {
          // Langkah 1: Cari dulu di Google
          const infoDariGoogle = await cariDiGoogle(query);

          // Langkah 2: Kasih datanya ke Groq
          const hasil = await panggilGroq(query, infoDariGoogle);
          lastDraft = hasil;

          await sendMessage(
            chatId,
            `📝 DRAF VALID (BERDASARKAN GOOGLE):\n\n${hasil}\n\nKirim link gambar sebelum FIX`
          );
        } catch (err) {
          console.log("Groq/Search error:", err);
          await sendMessage(chatId, "❌ Error saat memproses data");
        }
      }

      // LINK GAMBAR
      else if (
        lastDraft &&
        /^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i.test(text)
      ) {
        imageUrl = text;
        pendingImage = true;

        await sendMessage(
          chatId,
          `🖼️ Gambar diterima:\n${imageUrl}\n\nKetik FIX (Huruf Besar Semua) untuk publish`
        );
      }

      // FIX
      else if (text === "FIX") {
        if (!lastDraft) {
          await sendMessage(chatId, "Belum ada draft yang dibuat, kirim perintah cari: judul berita terlebih dahulu");
          continue;
        }

        if (!pendingImage || !imageUrl) {
          await sendMessage(chatId, "Kirim link gambar terlebih dahulu sebelum FIX");
          continue;
        }

        lastDraft = lastDraft.replace(/📝 DRAF:\s*/i, "").trim();

        const judul = ambilJudul(lastDraft);
        const ringkasan = ambilRingkasan(lastDraft);
        const isi = ambilIsi(lastDraft);

        console.log({
          judul,
          ringkasan,
          isi,
          gambar: imageUrl
        });

        try {
          const res = await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              action: "addWarta",
              trtyjfk: "34567ujhbvfrt",
              judul: judul,
              isi: isi,
              ringkasan: ringkasan,
              gambar: imageUrl
            })
          });

          const resultText = await res.text();

          console.log("RESPONSE APPS SCRIPT:", resultText);

          await sendMessage(chatId, "🚀 Artikel beserta Gambar Berhasil Diupload!");

          lastDraft = "";
          pendingImage = false;
          imageUrl = "";

        } catch (err) {
          console.log("ERROR FETCH:", err);
          await sendMessage(chatId, "❌ Gagal kirim ke server");
        }
      }
    }
  } catch (err) {
    console.log("getUpdates error:", err);
  }
}

// =======================
// GROQ (DENGAN DATA GOOGLE)
// =======================
async function panggilGroq(prompt, infoInternet) {
  console.log("--- DATA YANG DITERIMA DARI GOOGLE ---");
  console.log(infoInternet); // Ini biar kelihatan di Railway Logs datanya masuk atau nggak
  console.log("---------------------------------------");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `Kamu adalah jurnalis FAKTUAL.
          Tugasmu: Menulis berita hanya berdasarkan DATA INTERNET yang diberikan.
          
          ⚠️ LARANGAN KERAS:
          1. JANGAN PERNAH membuat nama tokoh fiksi (seperti Aldis Burger dll).
          2. JANGAN PERNAH menghubungkan ke pesantren jika di data internet tidak ada hubungannya dengan pesantren.
          3. JIKA DATA INTERNET KOSONG atau tidak relevan, cukup balas dengan: "MAAF, DATA TIDAK DITEMUKAN DI GOOGLE. SAYA TIDAK MAU HALUSINASI."
          
          FORMAT WAJIB:
          JUDUL: ...
          RINGKASAN: ...
          ISI: ... (Gunakan <p> dan <b>)`
        },
        {
          role: "user",
          content: `DATA INTERNET DARI GOOGLE:\n${infoInternet}\n\nTopik yang dicari: ${prompt}`
        }
      ],
      temperature: 0.2 // Diturunkan supaya AI tidak berimajinasi (halusinasi)
    })
  });

  const json = await res.json();

  if (!json.choices || !json.choices[0]) {
    throw new Error("Respon Groq invalid");
  }

  return json.choices[0].message.content;
}

// =======================
// TELEGRAM SEND
// =======================
async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text
    })
  });
}

// =======================
// PARSER
// =======================
function ambilJudul(teks) {
  const match = teks.match(/JUDUL\s*:\s*(.+)/i);
  return match ? match[1].trim() : "";
}

function ambilRingkasan(teks) {
  const match = teks.match(/RINGKASAN\s*:\s*([\s\S]*?)(?=\n\s*ISI\s*:|$)/i);
  return match ? match[1].trim() : "";
}

function ambilIsi(teks) {
  const match = teks.match(/ISI\s*:\s*([\s\S]*)/i);
  return match ? match[1].trim() : "";
}

// =======================
// LOOP
// =======================
async function main() {
  while (true) {
    await getUpdates();
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

main();