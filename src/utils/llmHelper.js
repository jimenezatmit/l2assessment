import Groq from 'groq-sdk';

/**
 * LLM Helper for categorizing customer support messages using Groq.
 *
 * categorizeMessage() never rejects - a triage tool shouldn't leave a
 * support agent staring at a blank error screen just because the model
 * provider had a bad minute. Instead, on unrecoverable failure it
 * resolves with an explicitly degraded result: source: 'fallback',
 * degraded: true, and a confidence low enough that shouldEscalate()
 * (see templates.js) always routes it to a human. That's the mechanism
 * by which the failure "propagates" to the UI - callers must check
 * `degraded`/`source`, not assume every result came from the model.
 */

// Constructed lazily, inside the retry/fallback path, instead of at
// module load time. groq-sdk throws synchronously if the API key is
// missing - constructing it top-level meant a missing key crashed the
// whole module on import, before any try/catch could turn it into a
// graceful fallback.
let groqClient = null;
function getGroqClient() {
  if (!groqClient) {
    try {
      groqClient = new Groq({
        apiKey: import.meta.env.VITE_GROQ_API_KEY,
        dangerouslyAllowBrowser: true // Required for browser-based calls (not recommended for production!)
      });
    } catch (error) {
      throw new NonRetryableError(`Groq client could not be initialized: ${error.message}`);
    }
  }
  return groqClient;
}

const CATEGORY_TAXONOMY = [
  'Billing Issue',
  'Technical Problem',
  'Feature Request',
  'General Inquiry',
  'Unknown',
];

const SYSTEM_PROMPT = `You are a support ticket classifier for a SaaS customer support triage tool.
Classify the customer message into exactly one of these categories:
- "Billing Issue": payments, invoices, charges, refunds, or subscription/billing management
- "Technical Problem": bugs, errors, outages, or broken functionality
- "Feature Request": requests for new functionality or enhancements
- "General Inquiry": questions, how-to requests, or feedback that isn't reporting a problem
- "Unknown": use only if the message genuinely does not fit any category above

Respond with a single JSON object and nothing else, in exactly this shape:
{"category": "<one of the categories above, verbatim>", "confidence": <number between 0 and 1>, "reasoning": "<one or two sentence explanation>"}`;

const REQUEST_TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 300;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const FALLBACK_CONFIDENCE = 0.2;

class NonRetryableError extends Error {}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withTimeout(promise, ms, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

/**
 * A validation error means the model responded but the response was
 * unusable (bad JSON, unknown category, etc) - retrying with the same
 * prompt won't fix that, so it's never retried. Anything else (network
 * failure, our own timeout, or a retryable HTTP status) is treated as
 * transient and worth a bounded retry.
 */
function isTransientError(error) {
  if (error instanceof NonRetryableError) return false;
  const status = error?.status ?? error?.response?.status;
  if (status) return RETRYABLE_STATUS_CODES.has(status);
  return true;
}

async function callGroq(message) {
  const response = await getGroqClient().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: message },
    ],
  });

  const raw = response.choices?.[0]?.message?.content;
  if (!raw) {
    throw new NonRetryableError('Groq response had no content');
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new NonRetryableError('Groq response was not valid JSON');
  }

  if (!CATEGORY_TAXONOMY.includes(parsed.category)) {
    throw new NonRetryableError(`Groq returned an unrecognized category: ${parsed.category}`);
  }
  if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
    throw new NonRetryableError('Groq response had an invalid confidence score');
  }
  if (typeof parsed.reasoning !== 'string' || !parsed.reasoning.trim()) {
    throw new NonRetryableError('Groq response had no reasoning');
  }

  return {
    category: parsed.category,
    confidence: parsed.confidence,
    reasoning: parsed.reasoning,
    source: 'llm',
    degraded: false,
  };
}

async function callGroqWithRetry(message) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await withTimeout(callGroq(message), REQUEST_TIMEOUT_MS, 'Groq request timed out');
    } catch (error) {
      lastError = error;
      if (!isTransientError(error) || attempt === MAX_ATTEMPTS) throw error;
      await sleep(attempt * RETRY_BASE_DELAY_MS);
    }
  }
  throw lastError;
}

/**
 * Categorize a customer support message.
 *
 * @param {string} message - The customer support message
 * @returns {Promise<{category: string, reasoning: string, confidence: number, source: 'llm'|'fallback', degraded: boolean}>}
 */
export async function categorizeMessage(message) {
  try {
    return await callGroqWithRetry(message);
  } catch (error) {
    console.warn('Groq categorization failed after retries, falling back to keyword matching:', error.message);
    return getMockCategorization(message, error);
  }
}

/**
 * Keyword-based fallback for when the model is unavailable or its
 * response can't be trusted. Always marked degraded/low-confidence so
 * downstream code (shouldEscalate) routes it to a human instead of
 * treating it as a real AI judgment.
 */
function getMockCategorization(message, cause) {
  const lowerMessage = message.toLowerCase();

  const reasoningVariations = {
    billing: [
      "Based on keywords related to payments and billing, this appears to be a billing-related inquiry.",
      "This message contains billing terminology suggesting a payment or invoice issue.",
      "The message references financial matters related to the customer's account.",
    ],
    technical: [
      "This message describes technical difficulties or system errors.",
      "Based on error-related keywords, this appears to be a technical support issue.",
      "The message indicates a technical problem or bug.",
    ],
    feature: [
      "This message suggests improvements or new functionality.",
      "The customer appears to be requesting an enhancement.",
      "Based on the language used, this seems to be a product suggestion.",
    ],
    inquiry: [
      "This appears to be a general question about the product or service.",
      "The message contains questions that don't indicate a specific problem.",
      "Based on the question format, this seems to be an information request.",
    ],
    positive: [
      "This message contains positive sentiment and appreciation.",
      "The customer is expressing satisfaction or gratitude.",
    ],
    ambiguous: [
      "The message content is unclear or doesn't match standard support categories.",
      "This message doesn't contain clear indicators for automatic categorization.",
    ],
  };

  const getRandomReasoning = category => {
    const reasons = reasoningVariations[category];
    return reasons[Math.floor(Math.random() * reasons.length)];
  };

  const disclaimer = cause
    ? `AI categorization is currently unavailable (${cause.message}); this is a keyword-based fallback guess and should be verified by a person.`
    : 'AI categorization is currently unavailable; this is a keyword-based fallback guess and should be verified by a person.';

  const buildResult = (category, reasoning) => ({
    category,
    confidence: FALLBACK_CONFIDENCE,
    reasoning: `${reasoning} ${disclaimer}`,
    source: 'fallback',
    degraded: true,
  });

  if (lowerMessage.includes('bill') || lowerMessage.includes('payment') ||
      lowerMessage.includes('charge') || lowerMessage.includes('invoice') ||
      lowerMessage.includes('credit card') || lowerMessage.includes('subscription') ||
      lowerMessage.includes('refund') || (lowerMessage.includes('cancel') && lowerMessage.includes('account'))) {
    return buildResult('Billing Issue', getRandomReasoning('billing'));
  }

  if (lowerMessage.includes('bug') || lowerMessage.includes('error') ||
      lowerMessage.includes('broken') || lowerMessage.includes('not working') ||
      lowerMessage.includes('crash') || lowerMessage.includes('down') ||
      lowerMessage.includes('server') || lowerMessage.includes('loading') ||
      lowerMessage.includes('slow') || lowerMessage.includes('issue') ||
      (lowerMessage.includes('problem') && !lowerMessage.includes('no problem'))) {
    return buildResult('Technical Problem', getRandomReasoning('technical'));
  }

  if (lowerMessage.includes('feature') || (lowerMessage.includes('add') && (lowerMessage.includes('please') || lowerMessage.includes('could'))) ||
      lowerMessage.includes('improve') || lowerMessage.includes('would like to see') ||
      lowerMessage.includes('suggestion') || lowerMessage.includes('wish') ||
      (lowerMessage.includes('could you') && lowerMessage.includes('add')) ||
      lowerMessage.includes('enhancement') || lowerMessage.includes('would be great')) {
    return buildResult('Feature Request', getRandomReasoning('feature'));
  }

  if ((lowerMessage.includes('thank') || lowerMessage.includes('thanks') || lowerMessage.includes('appreciate')) &&
      !lowerMessage.includes('but') && !lowerMessage.includes('however')) {
    return buildResult('General Inquiry', getRandomReasoning('positive'));
  }

  if (lowerMessage.includes('how') || lowerMessage.includes('what') ||
      lowerMessage.includes('when') || lowerMessage.includes('where') ||
      lowerMessage.includes('can i') || lowerMessage.includes('is there') ||
      lowerMessage.includes('?')) {
    return buildResult('General Inquiry', getRandomReasoning('inquiry'));
  }

  return buildResult('Unknown', getRandomReasoning('ambiguous'));
}
