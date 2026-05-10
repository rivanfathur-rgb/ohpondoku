const TOKEN = "8746255186:AAFaTcvUpIRSJwi1WAzxJJwjmY89rOsS2is";
const GROQ_API_KEY = "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";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwxLRb8CBM0KaUhk5hVpYO2NatXul2zwxtqwIldC4ewFp1lrVWgJbRVwFMlJhUW9Y_9/exec";
const ADMIN_ID = 6347304510;

let offset = 0;
let lastDraft = "";
let pendingImage = false;
let imageUrl = "";

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

      // CARI AI
      else if (text.startsWith("Cari:")) {
        const query = text.replace("Cari:", "").trim();

        await sendMessage(chatId, "🔍 Memuat Artikel...");

        try {
          const hasil = await panggilGroq(query);
          lastDraft = hasil;

          await sendMessage(
            chatId,
            `📝 DRAF:\n\n${hasil}\n\nKirim link gambar sebelum FIX`
          );
        } catch (err) {
          console.log("Groq error:", err);
          await sendMessage(chatId, "❌ Error AI");
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
// GROQ
// =======================
async function panggilGroq(prompt) {
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
          content: `Tulis berita pesantren formal dengan format WAJIB:

JUDUL: ...
RINGKASAN: ...
ISI: ...

ATURAN:
Ringkasan maksimal 2 kalimat. Jangan keluar dari format.
dalam kolom isi tambahkan: <p> untuk paragraf baru atau garis baru, dan gunakan <b> atau <strong> untuk bold. Jangan buat format lain selain yang diminta.
contoh:
<p><b>MISSISSIPPI</b> – Kabar membanggakan datang dari salah satu santri berbakat nama pondok yang berhasil menunjukkan tajinya di luar bidang akademik. Ananda <strong>Ahmad Zaki</strong> sukses meraih Juara Pertama dalam ajang Lomba Mancing kategori 3 yang diselenggarakan di tingkat kecamatan. Prestasi ini menjadi bukti bahwa santri tidak hanya unggul dalam urusan literasi dan spiritual, tetapi juga memiliki ketangkasan dan kesabaran yang luar biasa dalam kegiatan luar ruangan.</p>

<p>Perjuangan Ahmad Zaki dalam kompetisi yang berlangsung di tepian sungai Mississippi ini tidaklah mudah. Ia harus bersaing dengan puluhan peserta lainnya yang memiliki pengalaman cukup mumpuni di bidang memancing. Namun, berkat ketenangan dan strategi yang tepat, ia berhasil mengamankan posisi puncak. Keberhasilan ini membawa kebanggaan tersendiri bagi keluarga besar nama pondok yang selalu mendukung pengembangan minat dan bakat para santrinya di berbagai lini.</p>`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7
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