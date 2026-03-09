const express = require('express');
const multer = require('multer');
const cors = require('cors');
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
    const roomData = fs.readFileSync(roomFile.path);
    fs.unlinkSync(roomFile.path);
    if (req.files['pattern']) fs.unlinkSync(req.files['pattern'][0].path);
    res.set('Content-Type', roomFile.mimetype);
    res.send(roomData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu çalışıyor: ${PORT}`));
