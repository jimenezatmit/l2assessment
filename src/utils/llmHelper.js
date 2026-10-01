import Groq from 'groq-sdk';

/**
 * LLM Helper for categorizing customer support messages
 * Using Groq API for AI-powered categorization
 */

// The Groq client is created lazily, on first use, and only when a key is
// configured. Constructing it eagerly at module load throws when
// VITE_GROQ_API_KEY is unset, which crashes the whole app bundle before
// React can render anything - breaking the documented mock-mode fallback.
let groq = null;

function getGroqClient() {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) return null;
  if (!groq) {
    groq = new Groq({
      apiKey,
      dangerouslyAllowBrowser: true // Required for browser-based calls (not recommended for production!)
    });
  }
  return groq;
}

const CATEGORY_KEYWORD_RULES = [
  ['Billing Issue', ['billing']],
  ['Technical Problem', ['technical', 'bug']],
  ['Feature Request', ['feature']],
  ['General Inquiry', ['inquiry', 'question']],
];

/**
 * Parses a category out of the LLM's freeform response text.
 *
 * Exported standalone (rather than inlined in categorizeMessage) so it can
 * be unit-tested with fabricated response strings, independent of a live
 * Groq call.
 *
 * @param {string} content - The LLM's raw response text
 * @returns {{category: string, confidence: 'high'|'low'}}
 */
export function parseCategoryFromResponse(content) {
  const lower = content.toLowerCase();
  const matchedCategories = CATEGORY_KEYWORD_RULES
    .filter(([, keywords]) => keywords.some(keyword => lower.includes(keyword)))
    .map(([category]) => category);

  if (matchedCategories.length === 1) {
    return { category: matchedCategories[0], confidence: 'high' };
  }
  if (matchedCategories.length === 0) {
    return { category: 'Unknown', confidence: 'low' };
  }
  // The response touched more than one category's keywords - genuinely
  // ambiguous. Keep the highest-priority guess but flag it low-confidence
  // rather than silently presenting it as a clean match.
  return { category: matchedCategories[0], confidence: 'low' };
}

/**
 * Categorize a customer support message using Groq AI
 *
 * @param {string} message - The customer support message
 * @returns {Promise<{category: string, reasoning: string, source: 'ai'|'mock', confidence: 'high'|'low'}>}
 */
export async function categorizeMessage(message) {
  const client = getGroqClient();
  if (!client) {
    return getMockCategorization(message);
  }

  try {
    const response = await client.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        {
          role: "user",
          content: `Categorize this customer support message: ${message}`
        }
      ],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    const { category, confidence } = parseCategoryFromResponse(content);

    return {
      category,
      reasoning: content,
      source: 'ai',
      confidence
    };
  } catch (error) {
    console.warn('Groq API failed, using mock response:', error.message);
    return getMockCategorization(message);
  }
}

/**
 * Mock categorization for when API is unavailable
 */
function getMockCategorization(message) {
  const lowerMessage = message.toLowerCase();

  // Array of possible reasoning variations for each category
  const reasoningVariations = {
    billing: [
      "Based on keywords related to payments and billing, this appears to be a billing-related inquiry. The customer may need assistance with account charges or payment issues.",
      "This message contains billing terminology. The customer is likely experiencing issues with payments, invoices, or account charges.",
      "The message references financial matters related to the customer's account. This suggests a billing or payment concern that requires attention.",
    ],
    technical: [
      "This message describes technical difficulties or system errors. The customer is reporting functionality issues that may require engineering review.",
      "Based on error-related keywords, this appears to be a technical support issue. The customer is experiencing problems with product functionality.",
      "The message indicates a technical problem or bug. This requires investigation from the technical support team.",
      "System-related issues are mentioned in this message. The customer needs technical assistance to resolve functionality problems.",
    ],
    feature: [
      "This message suggests improvements or new functionality. The customer is providing product feedback and feature suggestions.",
      "The customer is requesting enhancements to the product. This appears to be a feature request that should be reviewed by the product team.",
      "Based on the language used, this seems to be a suggestion for product improvements rather than a support issue.",
    ],
    inquiry: [
      "This appears to be a general question about the product or service. The customer is seeking information or clarification.",
      "The message contains questions that don't indicate a specific problem. This is likely a general inquiry requiring informational support.",
      "Based on the question format, this seems to be an information request rather than a technical or billing issue.",
    ],
    positive: [
      "This message contains positive sentiment and appreciation. While not a support request, it may warrant acknowledgment.",
      "The customer is expressing satisfaction or gratitude. This doesn't appear to require immediate support action.",
    ],
    ambiguous: [
      "The message content is unclear or doesn't match standard support categories. Manual review may be needed for proper categorization.",
      "This message doesn't contain clear indicators for automatic categorization. Human review recommended.",
    ]
  };

  // Helper to get random reasoning
  const getRandomReasoning = (category) => {
    const reasons = reasoningVariations[category];
    return reasons[Math.floor(Math.random() * reasons.length)];
  };

  // Billing-related detection
  if (lowerMessage.includes('bill') || lowerMessage.includes('payment') ||
      lowerMessage.includes('charge') || lowerMessage.includes('invoice') ||
      lowerMessage.includes('credit card') || lowerMessage.includes('subscription') ||
      lowerMessage.includes('refund') || lowerMessage.includes('cancel') && lowerMessage.includes('account')) {
    return {
      category: "Billing Issue",
      reasoning: getRandomReasoning('billing'),
      source: 'mock',
      confidence: 'high'
    };
  }

  // Technical problem detection
  if (lowerMessage.includes('bug') || lowerMessage.includes('error') ||
      lowerMessage.includes('broken') || lowerMessage.includes('not working') ||
      lowerMessage.includes('crash') || lowerMessage.includes('down') ||
      lowerMessage.includes('server') || lowerMessage.includes('loading') ||
      lowerMessage.includes('slow') || lowerMessage.includes('issue') ||
      lowerMessage.includes('problem') && !lowerMessage.includes('no problem')) {
    return {
      category: "Technical Problem",
      reasoning: getRandomReasoning('technical'),
      source: 'mock',
      confidence: 'high'
    };
  }

  // Feature request detection
  if (lowerMessage.includes('feature') || lowerMessage.includes('add') && (lowerMessage.includes('please') || lowerMessage.includes('could')) ||
      lowerMessage.includes('improve') || lowerMessage.includes('would like to see') ||
      lowerMessage.includes('suggestion') || lowerMessage.includes('wish') ||
      lowerMessage.includes('could you') && lowerMessage.includes('add') ||
      lowerMessage.includes('enhancement') || lowerMessage.includes('would be great')) {
    return {
      category: "Feature Request",
      reasoning: getRandomReasoning('feature'),
      source: 'mock',
      confidence: 'high'
    };
  }

  // Positive feedback detection
  if ((lowerMessage.includes('thank') || lowerMessage.includes('thanks') || lowerMessage.includes('appreciate')) &&
      !lowerMessage.includes('but') && !lowerMessage.includes('however')) {
    return {
      category: "General Inquiry",
      reasoning: getRandomReasoning('positive'),
      source: 'mock',
      confidence: 'high'
    };
  }

  // Question/inquiry detection
  if (lowerMessage.includes('how') || lowerMessage.includes('what') ||
      lowerMessage.includes('when') || lowerMessage.includes('where') ||
      lowerMessage.includes('can i') || lowerMessage.includes('is there') ||
      lowerMessage.includes('?')) {
    return {
      category: "General Inquiry",
      reasoning: getRandomReasoning('inquiry'),
      source: 'mock',
      confidence: 'high'
    };
  }

  // Fallback for ambiguous messages - the mock heuristics found no clear
  // signal at all, so this is a guess, not a confident match.
  return {
    category: "General Inquiry",
    reasoning: getRandomReasoning('ambiguous'),
    source: 'mock',
    confidence: 'low'
  };
}
