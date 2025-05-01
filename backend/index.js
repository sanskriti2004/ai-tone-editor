// server.js - Main Express server file
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const NodeCache = require("node-cache");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Cache setup with TTL of 2 hours
const toneCache = new NodeCache({ stdTTL: 7200 });

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Tone adjustment endpoint
app.post("/api/adjust-tone", async (req, res) => {
  try {
    const { text, toneLevel } = req.body;

    if (!text || toneLevel === undefined) {
      return res.status(400).json({
        error: "Missing required parameters: text and toneLevel are required",
      });
    }

    // Create a cache key based on text and tone level
    const cacheKey = `${text}_${toneLevel}`;

    // Check if we have a cached result
    const cachedResult = toneCache.get(cacheKey);
    if (cachedResult) {
      return res.status(200).json({
        result: cachedResult,
        source: "cache",
      });
    }

    // Map tone level (0-100) to descriptive labels for the AI prompt
    const toneDescription = getToneDescription(toneLevel);

    // Prepare prompt for Mistral AI
    const prompt = `Rewrite the following text to make it sound ${toneDescription}. 
Keep the original meaning intact but adjust the tone accordingly. 
Do not add any explanations, just return the rewritten text.

Original text: "${text}"`;

    // Make API call to Mistral AI
    const response = await axios.post(
      "https://api.mistral.ai/v1/chat/completions",
      {
        model: "mistral-small",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
        },
      }
    );

    // Extract the generated content
    const result = response.data.choices[0].message.content.trim();

    // Cache the result
    toneCache.set(cacheKey, result);

    // Return the result
    res.status(200).json({ result });
  } catch (error) {
    console.error("Error adjusting tone:", error);

    // Handle rate limiting
    if (error.response && error.response.status === 429) {
      return res.status(429).json({
        error: "Rate limit exceeded. Please try again later.",
      });
    }

    // Handle authentication errors
    if (error.response && error.response.status === 401) {
      return res.status(500).json({
        error: "API authentication error. Please check server configuration.",
      });
    }

    // Handle other errors
    res.status(500).json({
      error: "Failed to adjust tone",
      message: error.message,
    });
  }
});

// Clear cache endpoint (useful for testing)
app.post("/api/clear-cache", (req, res) => {
  toneCache.flushAll();
  res.status(200).json({ message: "Cache cleared successfully" });
});

// Helper function to map tone level to description
function getToneDescription(toneLevel) {
  // Convert numeric tone level (0-100) to descriptive tone
  if (toneLevel <= 20) {
    return "very formal and professional";
  } else if (toneLevel <= 40) {
    return "formal";
  } else if (toneLevel <= 60) {
    return "neutral";
  } else if (toneLevel <= 80) {
    return "casual";
  } else {
    return "very casual and conversational";
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // For testing purposes
