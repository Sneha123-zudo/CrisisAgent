import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import fetch from 'node-fetch';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const PORT = 3000;

// Init Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function fetchWeather(lat, lon) {
  const apiKey = process.env.WEATHER_API_KEY;
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
  );
  const data = await response.json();
  return {
    temp: data.main.temp,
    humidity: data.main.humidity,
    condition: data.weather[0].description,
    windSpeed: data.wind.speed,
    rainfall: data.rain ? data.rain['1h'] || 0 : 0,
  };
}

async function generateCrisisResponse(weatherData) {
  const prompt = `
You're an expert crisis response AI for farmers. Based on this weather data:
- Temperature: ${weatherData.temp}°C
- Humidity: ${weatherData.humidity}%
- Condition: ${weatherData.condition}
- Wind Speed: ${weatherData.windSpeed} m/s
- Rainfall: ${weatherData.rainfall} mm

Analyze for agricultural emergencies like:
1. Flood
2. Drought
3. Pest Outbreak
4. Cyclone
5. Market Crash

Output should be structured in this format:

🌾 Crisis Report:
-----------------------
🔍 Current Weather Summary:
(temp, humidity, rainfall, etc.)

🚨 Detected Crisis (if any):
[List all that may occur based on data]

🛡 Suggested Mitigation Strategy:
[Details + precautions]

📢 Emergency Support Instructions:
[What the farmer should do]

📦 Recommended Resources:
[List items like pesticides, covers, crop insurance links, etc.]

Make it easy to read and useful.
`;

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' }); // ✅ Updated model name
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

app.post('/crisis-agent', async (req, res) => {
  const { lat, lon } = req.body;
  try {
    const weatherData = await fetchWeather(lat, lon);
    const analysis = await generateCrisisResponse(weatherData);
    res.json({ weather: weatherData, analysis });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`🚨 Crisis Agent running at http://localhost:${PORT}`);
});
app.get('/', (req, res) => {
  res.send('🌾 Crisis Agent Server is running! Use POST /crisis-agent');
});
