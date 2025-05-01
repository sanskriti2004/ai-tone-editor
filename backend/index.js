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

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Main endpoint
app.post("/api/adjust-tone", async (req, res) => {
  try {
    const { text, formalityLevel, verbosityLevel } = req.body;
    if (!text || formalityLevel === undefined || verbosityLevel === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const originalWordCount = text.trim().split(/\s+/).length;

    // Compute target word count
    let targetWordCount = originalWordCount;
    if (verbosityLevel <= 20) {
      targetWordCount = Math.ceil(
        originalWordCount * (0.6 - verbosityLevel / 50)
      );
    } else if (verbosityLevel <= 40) {
      targetWordCount = Math.ceil(
        originalWordCount * (0.8 - (verbosityLevel - 20) / 100)
      );
    } else if (verbosityLevel <= 60) {
      targetWordCount = Math.ceil(
        originalWordCount * (0.9 + (verbosityLevel - 40) / 100)
      );
    } else if (verbosityLevel <= 80) {
      targetWordCount = Math.ceil(
        originalWordCount * (1.1 + (verbosityLevel - 60) / 100)
      );
    } else {
      targetWordCount = Math.ceil(
        originalWordCount * (1.3 + (verbosityLevel - 80) / 100)
      );
    }

    const cacheKey = `${text}_${formalityLevel}_${verbosityLevel}`;
    const cached = toneCache.get(cacheKey);
    if (cached) {
      return res.status(200).json({ result: cached });
    }

    const { formalityDesc, verbosityDesc } = getToneDescriptions(
      formalityLevel,
      verbosityLevel
    );

    const prompt = `Rewrite the following text in a tone that is:
- ${formalityDesc}
- ${verbosityDesc}

Guidelines:
- If concise, reduce fluff and focus on brevity.
- If expanded, elaborate key points and add details.
- If formal, use proper grammar and professional tone.
- If casual, write like you're speaking to a friend.

Rewrite this:
"${text}"
`;

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

    let result = response.data.choices[0].message.content.trim();
    const resultWordCount = result.split(/\s+/).length;
    const percentageChange =
      ((resultWordCount - originalWordCount) / originalWordCount) * 100;

    if (verbosityLevel <= 30 && percentageChange > -20) {
      try {
        const retry = await axios.post(
          "https://api.mistral.ai/v1/chat/completions",
          {
            model: "mistral-small",
            messages: [
              {
                role: "user",
                content: `Make this text very concise (under ${targetWordCount} words), preserving key meaning:
"${result}"`,
              },
            ],
            temperature: 0.5,
            max_tokens: 2000,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
            },
          }
        );
        result = retry.data.choices[0].message.content.trim();
      } catch (e) {
        console.error("Second pass error:", e.message);
      }
    }

    toneCache.set(cacheKey, result);
    res.status(200).json({ result });
  } catch (err) {
    console.error("Error:", err);
    if (err.response && err.response.status === 429) {
      return res.status(429).json({ error: "Rate limit exceeded." });
    }
    if (err.response && err.response.status === 401) {
      return res.status(401).json({ error: "API key invalid or missing." });
    }
    res.status(500).json({ error: "Internal server error." });
  }
});

// Clear cache for testing
app.post("/api/clear-cache", (req, res) => {
  toneCache.flushAll();
  res.status(200).json({ message: "Cache cleared." });
});

// Helper
function getToneDescriptions(formalityLevel, verbosityLevel) {
  let formalityDesc =
    formalityLevel <= 20
      ? "extremely formal"
      : formalityLevel <= 40
      ? "formal"
      : formalityLevel <= 60
      ? "neutral"
      : formalityLevel <= 80
      ? "casual"
      : "very casual";

  let verbosityDesc =
    verbosityLevel <= 20
      ? "extremely concise"
      : verbosityLevel <= 40
      ? "concise"
      : verbosityLevel <= 60
      ? "moderately detailed"
      : verbosityLevel <= 80
      ? "detailed"
      : "highly detailed";

  return { formalityDesc, verbosityDesc };
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
