/**
 * Hand-labelled golden set for triage urgency evaluation.
 *
 * expectedUrgency is the *true* business priority a human triager would
 * assign, independent of surface style (punctuation, capitalization,
 * politeness). Several entries are deliberately adversarial: the tone of
 * the message and its true priority point in opposite directions, because
 * that's exactly where a style-based scorer is expected to fail.
 *
 * tag groups entries by the category called out in the review brief so
 * failures can be sliced by category, not just by label.
 */

export const goldenSet = [
  // --- Terse but critical ---
  { id: 'terse-1', tag: 'terse-critical', expectedUrgency: 'High',
    message: 'Database connection lost.' },
  { id: 'terse-2', tag: 'terse-critical', expectedUrgency: 'High',
    message: 'Production is down.' },
  { id: 'terse-3', tag: 'terse-critical', expectedUrgency: 'High',
    message: 'Site returning 500 errors for all users right now.' },
  { id: 'terse-4', tag: 'terse-critical', expectedUrgency: 'High',
    message: 'Payment processor is failing for every transaction since this morning.' },
  { id: 'terse-5', tag: 'terse-critical', expectedUrgency: 'High',
    message: 'We are experiencing a complete outage across all regions.' },

  // --- Politely-worded emergencies ---
  { id: 'polite-1', tag: 'polite-emergency', expectedUrgency: 'High',
    message: "Hi there, sorry to bother you, but our production database seems to be down and none of our customers can log in. Could you please help as soon as you're able?" },
  { id: 'polite-2', tag: 'polite-emergency', expectedUrgency: 'High',
    message: "Good afternoon! I hope you're doing well. I wanted to flag that our entire checkout flow has been throwing errors for the last hour and we're losing sales. Would really appreciate a quick look, thank you!" },
  { id: 'polite-3', tag: 'polite-emergency', expectedUrgency: 'High',
    message: 'Thanks so much for your help earlier. One more thing - our API keys stopped authenticating about 10 minutes ago and every integration is failing. Could you take a look when you get a chance?' },
  { id: 'polite-4', tag: 'polite-emergency', expectedUrgency: 'High',
    message: 'Hello, could you kindly check on this? None of my team can access the platform and we have a client demo in 20 minutes.' },

  // --- Churn and legal threats ---
  { id: 'threat-1', tag: 'churn-legal', expectedUrgency: 'High',
    message: "This is completely unacceptable. If this data breach isn't addressed immediately we will be cancelling our contract and pursuing legal action." },
  { id: 'threat-2', tag: 'churn-legal', expectedUrgency: 'High',
    message: "I've already spoken with my attorney about the exposure of our customer data through your platform last week." },
  { id: 'threat-3', tag: 'churn-legal', expectedUrgency: 'High',
    message: 'We are actively evaluating competitors and will be cancelling our subscription unless someone calls me back today about the billing error that overcharged us three times.' },
  { id: 'threat-4', tag: 'churn-legal', expectedUrgency: 'High',
    message: "Cancel my account immediately. This is the third outage this month and I'm done." },

  // --- Ordinary defects ---
  { id: 'defect-1', tag: 'ordinary-defect', expectedUrgency: 'Medium',
    message: 'The export button doesn’t work when I select more than 10 rows.' },
  { id: 'defect-2', tag: 'ordinary-defect', expectedUrgency: 'Medium',
    message: 'I noticed the dashboard chart is showing the wrong date range sometimes.' },
  { id: 'defect-3', tag: 'ordinary-defect', expectedUrgency: 'Medium',
    message: "There's a small bug where the search filter resets after I navigate away and come back." },
  { id: 'defect-4', tag: 'ordinary-defect', expectedUrgency: 'Medium',
    message: 'Getting an occasional error when uploading large CSV files, happens maybe 1 in 10 tries.' },
  { id: 'defect-5', tag: 'ordinary-defect', expectedUrgency: 'Medium',
    message: 'The notification email formatting looks broken on mobile clients.' },

  // --- Feature requests ---
  { id: 'feature-1', tag: 'feature-request', expectedUrgency: 'Low',
    message: 'It would be great if you could add dark mode to the dashboard.' },
  { id: 'feature-2', tag: 'feature-request', expectedUrgency: 'Low',
    message: 'Could you add the ability to export reports as CSV? Would be really helpful.' },
  { id: 'feature-3', tag: 'feature-request', expectedUrgency: 'Low',
    message: 'Any plans to support Zapier integrations in the future?' },
  { id: 'feature-4', tag: 'feature-request', expectedUrgency: 'Low',
    message: 'Wish there was a way to bulk-tag tickets, just a suggestion for a future release.' },
  { id: 'feature-5', tag: 'feature-request', expectedUrgency: 'Low',
    message: 'It would be wonderful if you added keyboard shortcuts for common actions.' },

  // --- Pure praise ---
  { id: 'praise-1', tag: 'praise', expectedUrgency: 'Low',
    message: 'Just wanted to say thank you, your support team has been amazing this week!' },
  { id: 'praise-2', tag: 'praise', expectedUrgency: 'Low',
    message: 'Really happy with the product, the new update is fantastic. Great work team!' },
  { id: 'praise-3', tag: 'praise', expectedUrgency: 'Low',
    message: 'Thanks for the quick help yesterday, much appreciated!' },
  { id: 'praise-4', tag: 'praise', expectedUrgency: 'Low',
    message: 'Love the new interface, everything feels so much faster now.' },

  // --- Adversarial: tone and true priority disagree ---
  { id: 'adversarial-1', tag: 'adversarial', expectedUrgency: 'Low',
    message: 'THIS BUTTON COLOR LOOKS TERRIBLE!!! PLEASE FIX ASAP!!!' },
  { id: 'adversarial-2', tag: 'adversarial', expectedUrgency: 'Low',
    message: 'URGENT!!! URGENT!!! my export is taking 3 seconds longer than usual!!!' },
  { id: 'adversarial-3', tag: 'adversarial', expectedUrgency: 'High',
    message: "no rush at all, whenever you get a chance, but just fyi our production servers have been completely unreachable since last night and we've lost all customer data" },
  { id: 'adversarial-4', tag: 'adversarial', expectedUrgency: 'High',
    message: "congrats on the new release! btw not sure if this is related but I think user session tokens might be exposed in the URL - probably nothing but wanted to mention it" },
  { id: 'adversarial-5', tag: 'adversarial', expectedUrgency: 'High',
    message: 'During a routine review we discovered that the password reset endpoint does not validate token expiration, so previously issued reset links remain valid indefinitely and could let an attacker take over any customer account. We recommend this be treated as a critical security issue.' },
]
