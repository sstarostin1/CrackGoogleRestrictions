const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Основной маршрут
app.get('/', (req, res) => {
  res.json({ message: 'Gemini Proxy Server is running!' });
});

// Health check
app.get('/healthz', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'Gemini Proxy',
    timestamp: new Date().toISOString()
  });
});

// Универсальный прокси для всех путей Gemini API
app.all('/*', async (req, res) => {
  try {
    // Получаем оригинальный путь запроса
    const originalPath = req.path;
    
    // Определяем модель из пути
    let model = "gemini-pro"; // модель по умолчанию
    
    // Парсим модель из URL (например: /v1beta/models/gemini-3-pro-preview:streamGenerateContent)
    const modelMatch = originalPath.match(/models\/([^:]+)/);
    if (modelMatch) {
      model = modelMatch[1];
    }
    
    // Определяем тип запроса
    const isStream = originalPath.includes('streamGenerateContent');
    
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${isStream ? 'streamGenerateContent' : 'generateContent'}?key=${process.env.GEMINI_API_KEY}`;

    console.log(`Proxying to: ${geminiUrl}`);
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
    }

    // Для потокового ответа
    if (isStream) {
      res.setHeader('Content-Type', 'application/json');
      const data = await response.json();
      res.json(data);
    } else {
      // Для обычного ответа
      const data = await response.json();
      res.json(data);
    }
    
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy server error', 
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});