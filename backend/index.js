const express = require("express");
const cors = require("cors");
const axios = require("axios");
const NodeCache = require("node-cache");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Cache to reduce API calls
const toneCache = new NodeCache({ stdTTL: 7200 });

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
    const targetWordCount = calculateTargetWordCount(
      originalWordCount,
      verbosityLevel
    );
    const cacheKey = `${text}_${formalityLevel}_${verbosityLevel}`;

    const cached = toneCache.get(cacheKey);
    if (cached) return res.status(200).json({ result: cached });

    const { formalityDesc, verbosityDesc } = getToneDescriptions(
      formalityLevel,
      verbosityLevel
    );

    const prompt = generatePrompt(
      text,
      formalityDesc,
      verbosityDesc,
      targetWordCount
    );

    const response = await callMistral(prompt);
    let result = response?.data?.choices[0]?.message?.content?.trim() || "";

    // Retry shortening if verbose output exceeds limit in concise mode
    if (verbosityLevel <= 30 && result.split(/\s+/).length > targetWordCount) {
      result = await retryShorten(result, targetWordCount);
    }

    toneCache.set(cacheKey, result);
    res.status(200).json({ result });
  } catch (err) {
    console.error("Error:", err);
    if (err.response?.status === 429)
      return res.status(429).json({ error: "Rate limit exceeded." });
    if (err.response?.status === 401)
      return res.status(401).json({ error: "API key invalid or missing." });
    res.status(500).json({ error: "Internal server error." });
  }
});

// Clear cache manually
app.post("/api/clear-cache", (req, res) => {
  toneCache.flushAll();
  res.status(200).json({ message: "Cache cleared." });
});

// ========== Helpers ==========

// Choose formality and verbosity descriptions based on slider levels
function getToneDescriptions(formalityLevel, verbosityLevel) {
  const formalityDesc =
    formalityLevel <= 20
      ? "extremely formal"
      : formalityLevel <= 40
      ? "formal"
      : formalityLevel <= 60
      ? "neutral"
      : formalityLevel <= 80
      ? "casual"
      : "very casual";

  const verbosityDesc =
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

// Calculate target word count based on verbosity level
function calculateTargetWordCount(originalWordCount, verbosityLevel) {
  if (verbosityLevel <= 20)
    return Math.ceil(originalWordCount * (0.6 - verbosityLevel / 50));
  if (verbosityLevel <= 40)
    return Math.ceil(originalWordCount * (0.8 - (verbosityLevel - 20) / 100));
  if (verbosityLevel <= 60)
    return Math.ceil(originalWordCount * (0.9 + (verbosityLevel - 40) / 100));
  if (verbosityLevel <= 80)
    return Math.ceil(originalWordCount * (1.1 + (verbosityLevel - 60) / 100));
  return Math.ceil(originalWordCount * (1.3 + (verbosityLevel - 80) / 100));
}

// Build prompt to send to Mistral
function generatePrompt(text, formalityDesc, verbosityDesc, targetWordCount) {
  return `Rewrite the following text with:
- Tone: ${formalityDesc}
- Verbosity: ${verbosityDesc}
- Target word count: ${targetWordCount} words

Guidelines:
- If concise, cut filler, simplify sentences, and aim for brevity.
- If expanded, add clarification and examples.
- If formal, use professional vocabulary and tone.
- If casual, use friendly and informal language.

Text:
"${text}"`;
}

// Call Mistral AI with prompt
async function callMistral(prompt) {
  return await axios.post(
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
}

// Retry shortening output if it's too long for concise mode
async function retryShorten(text, targetWordCount) {
  try {
    const retryPrompt = `Rewrite this text to be under ${targetWordCount} words.
Focus only on the essential message. Eliminate all extra detail and keep it brief.

Text:
"${text}"`;

    const retry = await callMistral(retryPrompt);
    let shorter = retry?.data?.choices[0]?.message?.content?.trim() || "";

    if (shorter.split(/\s+/).length > targetWordCount) {
      shorter =
        shorter.split(/\s+/).slice(0, targetWordCount).join(" ") + "...";
    }
    return shorter;
  } catch (err) {
    console.error("Retry shorten error:", err.message);
    return text;
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
