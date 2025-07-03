import express from "express";
import multer from "multer";
import fs from "fs";
import { OpenAI } from "openai";
import { getAudioUrl } from "gtts";

const app = express();
const upload = multer({ dest: "uploads/" });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/ask", upload.single("audio"), async (req, res) => {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: "whisper-1",
      language: "ar",
    });

    const question = transcription.text;
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "أجب باللغة العربية بصوت ذكر وباختصار" },
        { role: "user", content: question },
      ],
    });

    const answer = completion.choices[0].message.content;
    const gttsUrl = getAudioUrl(answer, { lang: "ar", slow: false });

    fs.unlinkSync(req.file.path); // حذف ملف الصوت المؤقت
    res.redirect(gttsUrl); // أرسل الصوت مباشرة للـ ESP32
  } catch (err) {
    res.status(500).send("خطأ: " + err.message);
  }
});

app.listen(3000, () => console.log("✅ الخادم يعمل على المنفذ 3000"));
