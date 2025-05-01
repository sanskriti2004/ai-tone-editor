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

// Tone adjustment endpoint - now with 2D tone matrix
app.post("/api/adjust-tone", async (req, res) => {
  try {
    const { text, formalityLevel, verbosityLevel } = req.body;

    if (!text || formalityLevel === undefined || verbosityLevel === undefined) {
      return res.status(400).json({
        error:
          "Missing required parameters: text, formalityLevel, and verbosityLevel are required",
      });
    }

    // Track original word count for comparison
    const originalWordCount = text.trim().split(/\s+/).length;

    // Calculate target word count based on verbosity level
    let targetWordCount = originalWordCount;
    if (verbosityLevel <= 20) {
      // Very concise: reduce by 40-60%
      targetWordCount = Math.ceil(
        originalWordCount * (0.6 - verbosityLevel / 50)
      );
    } else if (verbosityLevel <= 40) {
      // Concise: reduce by 20-40%
      targetWordCount = Math.ceil(
        originalWordCount * (0.8 - (verbosityLevel - 20) / 100)
      );
    } else if (verbosityLevel <= 60) {
      // Neutral: slight adjustments around original
      targetWordCount = Math.ceil(
        originalWordCount * (0.9 + (verbosityLevel - 40) / 100)
      );
    } else if (verbosityLevel <= 80) {
      // Expanded: increase by 10-30%
      targetWordCount = Math.ceil(
        originalWordCount * (1.1 + (verbosityLevel - 60) / 100)
      );
    } else {
      // Very expanded: increase by 30-50%
      targetWordCount = Math.ceil(
        originalWordCount * (1.3 + (verbosityLevel - 80) / 100)
      );
    }

    // Create a cache key based on text and both tone dimensions
    const cacheKey = `${text}_${formalityLevel}_${verbosityLevel}`;

    // Check if we have a cached result
    const cachedResult = toneCache.get(cacheKey);
    if (cachedResult) {
      // Calculate word count for cached result
      const resultWordCount = cachedResult.trim().split(/\s+/).length;
      const percentageChange =
        ((resultWordCount - originalWordCount) / originalWordCount) * 100;

      return res.status(200).json({
        result: cachedResult,
        source: "cache",
        metrics: {
          originalWordCount,
          resultWordCount,
          targetWordCount,
          percentageChange: percentageChange.toFixed(1),
          isMoreConcise: percentageChange < 0,
        },
      });
    }

    // Get tone descriptions for both dimensions
    const { formalityDesc, verbosityDesc } = getToneDescriptions(
      formalityLevel,
      verbosityLevel
    );

    // Prepare prompt for Mistral AI
    const prompt = `Rewrite the following text with EXTREME precision according to these two dimensions:

1. FORMALITY LEVEL: ${Math.round(
      100 - formalityLevel
    )}% (where 100% = extremely professional, 0% = extremely casual)
2. VERBOSITY LEVEL: ${Math.round(
      verbosityLevel
    )}% (where 0% = extremely concise, 100% = extremely expanded)

Your current tone should be: ${formalityDesc} and ${verbosityDesc}.

CRITICAL INSTRUCTIONS FOR VERBOSITY:
- For CONCISE text (0-30% verbosity):
  * Reduce word count by at least 30-50% compared to original
  * Use extremely short sentences, remove all non-essential words
  * Cut ALL unnecessary details, examples, and explanations
  * Focus only on the core message and key points
  * Use contractions, abbreviations, and shorter synonyms
  * For casual-concise text, use fragments and informal shortcuts

- For MODERATE text (31-70% verbosity):
  * Keep similar length to the original text
  * Balance detail with efficiency
  * Include important context but avoid unnecessary elaboration

- For EXPANDED text (71-100% verbosity):
  * Increase detail, context, and explanation
  * Add supporting examples or evidence where appropriate
  * Elaborate on key points with additional context
  * For professional-expanded text: add precise technical details and thorough analysis

CRITICAL INSTRUCTIONS FOR FORMALITY:
- For PROFESSIONAL text (70-100% formality):
  * Use formal language, industry-appropriate terminology
  * Maintain respectful, authoritative tone
  * Avoid contractions and colloquialisms
  * Use proper grammar and complete sentences

- For NEUTRAL text (30-70% formality):
  * Balance formal and informal elements
  * Use standard language that would be appropriate in most contexts

- For CASUAL text (0-30% formality):
  * Use conversational language, simpler terms
  * Include more personal pronouns (I, you, we)
  * Use contractions, everyday expressions
  * For very casual: include slang (when appropriate) and more relaxed grammar

EXTREMELY IMPORTANT: When positioned at an extreme corner (like 0% verbosity), that quality MUST be strongly reflected in your output. If verbosity is set to 0-20%, the result MUST be dramatically shorter than the original text, regardless of formality level.

IMPORTANT: Do not add any explanations, comments, or notes about the changes. Return ONLY the rewritten text.

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

    // Calculate word count metrics for the result
    const resultWordCount = result.trim().split(/\s+/).length;
    const percentageChange =
      ((resultWordCount - originalWordCount) / originalWordCount) * 100;

    // For extremely concise settings (0-30%), enforce strict word count limits
    let finalResult = result;
    if (verbosityLevel <= 30 && percentageChange > -20) {
      // If the AI didn't make it concise enough, try again with more explicit instructions
      try {
        const conciseResponse = await axios.post(
          "https://api.mistral.ai/v1/chat/completions",
          {
            model: "mistral-small",
            messages: [
              {
                role: "user",
                content: `Make this text EXTREMELY concise. Cut it down to AT MOST ${targetWordCount} words. 
                Remove all unnecessary words, phrases, and details while preserving core meaning. 
                Do not use transition phrases or filler words. Use the same formality level as the input.
                TEXT: ${result}`,
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

        finalResult = conciseResponse.data.choices[0].message.content.trim();
        const finalWordCount = finalResult.trim().split(/\s+/).length;
        const finalPercentageChange =
          ((finalWordCount - originalWordCount) / originalWordCount) * 100;

        // Cache the better result
        toneCache.set(cacheKey, finalResult);

        // Return the result with word count metrics
        return res.status(200).json({
          result: finalResult,
          metrics: {
            originalWordCount,
            resultWordCount: finalWordCount,
            targetWordCount,
            percentageChange: finalPercentageChange.toFixed(1),
            isMoreConcise: finalPercentageChange < 0,
            required2ndPass: true,
          },
        });
      } catch (secondPassError) {
        console.error("Error in conciseness enforcement:", secondPassError);
        // If second pass fails, continue with original result
      }
    }

    // Cache the result
    toneCache.set(cacheKey, finalResult);

    // Return the result with word count metrics
    res.status(200).json({
      result: finalResult,
      metrics: {
        originalWordCount,
        resultWordCount,
        targetWordCount,
        percentageChange: percentageChange.toFixed(1),
        isMoreConcise: percentageChange < 0,
      },
    });
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

// Helper function to map tone levels to descriptions
function getToneDescriptions(formalityLevel, verbosityLevel) {
  // Convert numeric formality level (0-100) to descriptive tone
  // Remember: 0 = Professional, 100 = Casual
  let formalityDesc;
  if (formalityLevel <= 20) {
    formalityDesc = "extremely professional and formal";
  } else if (formalityLevel <= 40) {
    formalityDesc = "professional and formal";
  } else if (formalityLevel <= 60) {
    formalityDesc = "neutral in formality";
  } else if (formalityLevel <= 80) {
    formalityDesc = "casual and approachable";
  } else {
    formalityDesc = "very casual and conversational";
  }

  // Convert numeric verbosity level (0-100) to descriptive tone
  // Remember: 0 = Concise, 100 = Expanded
  let verbosityDesc;
  if (verbosityLevel <= 20) {
    verbosityDesc = "extremely concise and minimal";
  } else if (verbosityLevel <= 40) {
    verbosityDesc = "concise and to-the-point";
  } else if (verbosityLevel <= 60) {
    verbosityDesc = "moderate in detail";
  } else if (verbosityLevel <= 80) {
    verbosityDesc = "detailed and thorough";
  } else {
    verbosityDesc = "highly detailed and comprehensive";
  }

  return { formalityDesc, verbosityDesc };
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // For testing purposes
