const actionTemplates = {
  "Billing Issue": "Verify the charge in Stripe, check the customer's subscription status, and respond with a clear explanation or issue a refund if warranted.",
  "Technical Problem": "Reproduce the issue in a test environment, check recent deployment logs, and escalate to engineering if confirmed. Respond with an ETA.",
  "General Inquiry": "Respond with the relevant help center article. If no article exists, draft a direct answer and flag for documentation.",
  "Feature Request": "Log the request in the product feedback tracker with the customer's use case. Send an acknowledgment and set expectation that the team will review.",
  "Churn Risk": "Flag for immediate Account Management outreach. Do not send an automated response — a human should contact this customer within the hour.",
  "Positive Feedback": "Thank the customer and consider asking for a G2 or Capterra review. Share internally with the team.",
  "Unknown": "Route to senior support agent for manual review."
};

const routingTeams = {
  "Billing Team": "billing@relayai.com",
  "Technical Support": "tech-support@relayai.com",
  "Product Team": "product@relayai.com",
  "General Support": "support@relayai.com",
  "Account Management": "accounts@relayai.com"
};

export function getRecommendedAction(category) {
  return actionTemplates[category] || actionTemplates["Unknown"];
}

export function getRoutingEmail(routing) {
  return routingTeams[routing] || routingTeams["General Support"];
}

export function getAvailableCategories() {
  return Object.keys(actionTemplates);
}

export function shouldEscalate(category, priority, urgencyFlag) {
  return urgencyFlag === true || priority === "Critical" || category === "Churn Risk";
}
