const express = require('express');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const app = express();

const MONGO_URL = 'mongodb://127.0.0.1:27017';
const DATABASE_NAME = 'vocabulary-db';
let vocabCollection = null; 

app.use((req, res, next) => {
  console.log(`${new Date().toLocaleTimeString()} ${req.method} ${req.url}`);
  next();
});

app.use(express.json());

app.use(express.static(path.join(__dirname, '..', 'public')));

function isValidId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

app.get('/', (req, res) => {
  res.send('Welcome to Vocabulary Log API');
});

app.get('/api/vocabulary', async (req, res) => {
  try {
    const { mastered, language } = req.query;
    const filter = {};

    if (mastered !== undefined) {
      filter.mastered = mastered === 'true';
    }
    if (language !== undefined) {
      filter.language = language;
    }

    const result = await vocabCollection
      .find(filter)
      .collation({ locale: 'en', strength: 2 })
      .toArray();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' });
  }
});

app.get('/api/vocabulary/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(404).json({ error: 'ไม่พบคำศัพท์นี้' });
    }
    const item = await vocabCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!item) {
      return res.status(404).json({ error: 'ไม่พบคำศัพท์นี้' });
    }
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' });
  }
});

app.post('/api/vocabulary', async (req, res) => {
  try {
    const { word, meaning, language, mastered } = req.body;

    if (!word || !meaning || !language) {
      return res.status(400).json({ error: 'ต้องระบุ word, meaning และ language' });
    }

    const newItem = {
      word: word,
      meaning: meaning,
      language: language,
      mastered: mastered === true
    };
    const result = await vocabCollection.insertOne(newItem);
    res.status(201).json({ _id: result.insertedId, ...newItem });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'มีคำศัพท์นี้ในภาษานี้อยู่แล้ว' });
    }
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' });
  }
});

app.patch('/api/vocabulary/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(404).json({ error: 'ไม่พบคำศัพท์นี้' });
    }
    const { word, meaning, language, mastered } = req.body;
    const updates = {};
    if (word !== undefined) updates.word = word;
    if (meaning !== undefined) updates.meaning = meaning;
    if (language !== undefined) updates.language = language;
    if (mastered !== undefined) updates.mastered = mastered === true;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'ไม่มีข้อมูลที่จะแก้ไข' });
    }

    const _id = new ObjectId(req.params.id);
    const result = await vocabCollection.updateOne({ _id }, { $set: updates });

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'ไม่พบคำศัพท์นี้' });
    }

    const item = await vocabCollection.findOne({ _id });
    res.json(item);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'มีคำศัพท์นี้ในภาษานี้อยู่แล้ว' });
    }
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' });
  }
});

app.delete('/api/vocabulary/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(404).json({ error: 'ไม่พบคำศัพท์นี้' });
    }

    const result = await vocabCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'ไม่พบคำศัพท์นี้' });
    }
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' });
  }
});

const PORT = 3000;

async function main() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  vocabCollection = client.db(DATABASE_NAME).collection('vocabulary');
  console.log('เชื่อมต่อ MongoDB สำเร็จ');

  await vocabCollection.createIndex(
    { word: 1, language: 1 },
    { unique: true, collation: { locale: 'en', strength: 2 } }
  );

  if ((await vocabCollection.countDocuments()) === 0) {
    await vocabCollection.insertMany([
      { word: 'ephemeral', meaning: 'อยู่ได้ไม่นาน ชั่วครู่ชั่วยาม', language: 'English', mastered: false },
      { word: '猫', meaning: 'แมว', language: 'Japanese', mastered: true },
      { word: '宁静', meaning: 'สงบ เงียบสงบ', language: 'Chinese', mastered: false }
    ]);
  }

  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}/`);
  });
}

main().catch(err => {
  console.error('เชื่อมต่อฐานข้อมูลไม่สำเร็จ:', err.message);
  if (err.code === 11000) {
    console.error('มีคำศัพท์ซ้ำอยู่ในฐานข้อมูลเดิม ให้ลบตัวที่ซ้ำออกก่อน (ใน Compass) แล้วรันใหม่');
  }
  process.exit(1);
});