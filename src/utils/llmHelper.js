import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

const SYSTEM_PROMPT = `You are a customer support triage AI for Relay AI, a B2B SaaS platform that helps small businesses manage customer operations.

Analyze the incoming customer message and respond with ONLY a valid JSON object — no explanation, no markdown, no extra text.

Return this exact structure:
{
  "category": one of ["Billing Issue", "Technical Problem", "Feature Request", "General Inquiry", "Churn Risk", "Positive Feedback"],
  "priority": one of ["Critical", "High", "Medium", "Low"],
  "urgency_flag": true or false,
  "routing": one of ["Billing Team", "Technical Support", "Product Team", "General Support", "Account Management"],
  "summary": "one sentence summary of the issue",
  "tone": one of ["Frustrated", "Neutral", "Positive", "Urgent"],
  "reasoning": "one to two sentences explaining your classification"
}

Classification rules:
- Churn Risk: customer mentions canceling, switching to a competitor, or threatens to leave
- Critical priority: full team locked out, data loss, system-wide outage, or security breach
- High priority: individual user blocked, payment failure, or time-sensitive issue
- Medium priority: degraded functionality, billing questions, general problems
- Low priority: feature requests, general questions, positive feedback
- urgency_flag = true if message mentions: down, outage, locked out, data loss, urgent, ASAP, or cancel threat
- Route Churn Risk to Account Management
- Always return valid JSON only, no extra text`;

export async function categorizeMessage(message) {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message }
      ],
      temperature: 0.1,
    });

    const content = response.choices[0].message.content.trim();
    const cleaned = content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      category: parsed.category || "General Inquiry",
      priority: parsed.priority || "Medium",
      urgencyFlag: parsed.urgency_flag || false,
      routing: parsed.routing || "General Support",
      summary: parsed.summary || "",
      tone: parsed.tone || "Neutral",
      reasoning: parsed.reasoning || ""
    };
  } catch (error) {
    console.warn('Groq API failed, using fallback:', error.message);
    return getMockCategorization(message);
  }
}

function getMockCategorization(message) {
  const m = message.toLowerCase();
  if (m.includes('cancel') || m.includes('switching') || m.includes('competitor')) return { category: "Churn Risk", priority: "High", urgencyFlag: true, routing: "Account Management", summary: "Customer threatening to leave.", tone: "Frustrated", reasoning: "Message contains churn signals." };
  if (m.includes('locked out') || m.includes('outage') || m.includes('down')) return { category: "Technical Problem", priority: "Critical", urgencyFlag: true, routing: "Technical Support", summary: "Critical system issue.", tone: "Urgent", reasoning: "Message indicates a blocking outage." };
  if (m.includes('bill') || m.includes('charge') || m.includes('refund')) return { category: "Billing Issue", priority: "Medium", urgencyFlag: false, routing: "Billing Team", summary: "Billing or payment question.", tone: "Neutral", reasoning: "Message contains billing keywords." };
  if (m.includes('bug') || m.includes('error') || m.includes('not working')) return { category: "Technical Problem", priority: "High", urgencyFlag: false, routing: "Technical Support", summary: "Technical issue reported.", tone: "Frustrated", reasoning: "Message describes a technical problem." };
  if (m.includes('feature') || m.includes('suggestion')) return { category: "Feature Request", priority: "Low", urgencyFlag: false, routing: "Product Team", summary: "Customer suggesting improvement.", tone: "Neutral", reasoning: "Message contains feature request language." };
  return { category: "General Inquiry", priority: "Low", urgencyFlag: false, routing: "General Support", summary: "General customer question.", tone: "Neutral", reasoning: "No specific category signals detected." };
}
