const express = require('express');
const multer = require('multer');
const Replicate = require('replicate');
const cors = require('cors');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Duvar tespiti + desen uygulama
app.post('/api/visualize', upload.fields([
  { name: 'room', maxCount: 1 },
  { name: 'pattern', maxCount: 1 }
]), async (req, res) => {
  try {
    const roomFile = req.files['room'][0];
    const patternFile = req.files['pattern'][0];

    // Oda fotoğrafını base64'e çevir
    const roomBase64 = fs.readFileSync(roomFile.path, { encoding: 'base64' });
    const roomDataUrl = `data:image/jpeg;base64,${roomBase64}`;

    // SAM ile duvar segmentasyonu
    const segmentation = await replicate.run(
      "schannel/clipseg:94a4db80d4c946e9ff4b4c8dbe47e6b8a58a9ad9f671c9d2f01b5d4c4d0d5b4b",
      {
        input: {
          image: roomDataUrl,
          prompt: "wall"
        }
      }
    );

    // Maske + desen birleştir
    const roomImg = sharp(roomFile.path);
    const roomMeta = await roomImg.metadata();
    const W = roomMeta.width;
    const H = roomMeta.height;

    // Deseni duvara uygula
    const patternTiled = await sharp(patternFile.path)
      .resize(W, H, { fit: 'cover' })
      .toBuffer();

    // Maskeyi indir
    const maskResponse = await fetch(segmentation);
    const maskBuffer = Buffer.from(await maskResponse.arrayBuffer());
    const maskResized = await sharp(maskBuffer)
      .resize(W, H)
      .greyscale()
      .toBuffer();

    // Kompozit: desen sadece duvar alanına
    const result = await sharp(roomFile.path)
      .composite([
        {
          input: patternTiled,
          blend: 'multiply',
          left: 0, top: 0
        }
      ])
      .jpeg({ quality: 90 })
      .toBuffer();

    // Temizlik
    fs.unlinkSync(roomFile.path);
    fs.unlinkSync(patternFile.path);

    res.set('Content-Type', 'image/jpeg');
    res.send(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
