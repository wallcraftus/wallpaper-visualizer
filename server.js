const express = require('express');
const multer = require('multer');
const Replicate = require('replicate');
const cors = require('cors');
const sharp = require('sharp');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/api/visualize', upload.fields([
  { name: 'room', maxCount: 1 },
  { name: 'pattern', maxCount: 1 }
]), async (req, res) => {
  try {
    const roomFile = req.files['room'][0];
    const patternFile = req.files['pattern'][0];

    const roomBase64 = fs.readFileSync(roomFile.path, { encoding: 'base64' });
    const ext = roomFile.mimetype.split('/')[1];
    const roomDataUrl = `data:image/${ext};base64,${roomBase64}`;

    // CLIPSeg ile duvar tespiti
    const output = await replicate.run(
      "lucataco/clipseg:a2d6b270a5d8a4f4a8e1f8c4f6a3e8b3d9f2c1a0b7e6d5c4f3b2a1e0d9c8b7a6",
      {
        input: {
          image: roomDataUrl,
          prompt: "wall"
        }
      }
    );

    const roomMeta = await sharp(roomFile.path).metadata();
    const W = roomMeta.width;
    const H = roomMeta.height;

    const patternTiled = await sharp(patternFile.path)
      .resize(W, H, { fit: 'cover' })
      .toBuffer();

    const result = await sharp(roomFile.path)
      .composite([{
        input: patternTiled,
        blend: 'multiply',
        left: 0,
        top: 0
      }])
      .jpeg({ quality: 90 })
      .toBuffer();

    fs.unlinkSync(roomFile.path);
    fs.unlinkSync(patternFile.path);

    res.set('Content-Type', 'image/jpeg');
    res.send(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu çalışıyor: ${PORT}`));
