const express = require('express');
const multer = require('multer');
const cors = require('cors');
const sharp = require('sharp');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

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

    const roomMeta = await sharp(roomFile.path).metadata();
    const W = roomMeta.width;
    const H = roomMeta.height;

    const patternBuf = await sharp(patternFile.path)
      .resize(W, H, { fit: 'cover' })
      .toBuffer();

    const result = await sharp(roomFile.path)
      .composite([{
        input: patternBuf,
        blend: 'soft-light',
        left: 0,
        top: 0
      }])
      .jpeg({ quality: 92 })
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
