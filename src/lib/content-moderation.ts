/**
 * Content Moderation Utilities
 * Similar to Instagram/TikTok content filtering
 */

// Comprehensive list of banned keywords
const BANNED_KEYWORDS = [
  // Explicit content
  "porn",
  "xxx",
  "nsfw",
  "explicit",
  "adult",
  "nude",
  "naked",
  "sex",
  "sexual",
  
  // Violence
  "gore",
  "blood",
  "violence",
  "kill",
  "murder",
  "weapon",
  
  // Hate speech
  "hate",
  "racist",
  "discrimination",
  
  // Drugs
  "drug",
  "cocaine",
  "heroin",
  "meth",
  
  // Add more as needed
];

// Suspicious patterns
const SUSPICIOUS_PATTERNS = [
  /\b(18\+|21\+|adult\s*only)\b/i,
  /\b(click\s*here|free\s*download)\b/i,
  /\b(hack|crack|pirate)\b/i,
];

/**
 * Check if text contains banned content
 */
export function containsBannedContent(text: string): boolean {
  // Use word-boundary regex to avoid false positives (e.g. "hackathon", "blood orange", "adult education")
  const hasBannedKeyword = BANNED_KEYWORDS.some((keyword) =>
    new RegExp(`\\b${keyword}\\b`, "i").test(text)
  );

  if (hasBannedKeyword) return true;

  // Check suspicious patterns
  const hasSuspiciousPattern = SUSPICIOUS_PATTERNS.some((pattern) =>
    pattern.test(text)
  );

  return hasSuspiciousPattern;
}

/**
 * Check if video metadata is appropriate
 */
export function moderateVideoMetadata(data: {
  title?: string;
  description?: string;
  filename?: string;
}): { allowed: boolean; reason?: string } {
  const { title, description, filename } = data;
  
  // Check title
  if (title && containsBannedContent(title)) {
    return {
      allowed: false,
      reason: "Title contains inappropriate content",
    };
  }
  
  // Check description
  if (description && containsBannedContent(description)) {
    return {
      allowed: false,
      reason: "Description contains inappropriate content",
    };
  }
  
  // Check filename
  if (filename && containsBannedContent(filename)) {
    return {
      allowed: false,
      reason: "Filename contains inappropriate content",
    };
  }
  
  return { allowed: true };
}

/**
 * Get content warning level
 */
export function getContentWarningLevel(text: string): "safe" | "warning" | "blocked" {
  if (containsBannedContent(text)) {
    return "blocked";
  }

  // Use word-boundary regex to avoid false positives on warning-level words
  const warningKeywords = ["violence", "blood", "scary"];
  const hasWarning = warningKeywords.some((keyword) =>
    new RegExp(`\\b${keyword}\\b`, "i").test(text)
  );

  if (hasWarning) {
    return "warning";
  }

  return "safe";
}

/**
 * Sanitize text by removing suspicious content
 */
export function sanitizeText(text: string): string {
  let sanitized = text;
  
  // Remove URLs
  sanitized = sanitized.replace(/https?:\/\/[^\s]+/g, "[link removed]");
  
  // Remove email addresses
  sanitized = sanitized.replace(/[\w.-]+@[\w.-]+\.\w+/g, "[email removed]");
  
  // Remove phone numbers
  sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[phone removed]");
  
  return sanitized;
}

/**
 * Check if user is spamming
 */
export function isSpamming(
  recentUploads: Date[],
  maxUploadsPerHour: number = 10
): boolean {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = recentUploads.filter((date) => date > oneHourAgo).length;
  return recentCount >= maxUploadsPerHour;
}

/**
 * Report content for manual review
 */
export interface ContentReport {
  contentId: string;
  contentType: "video" | "comment" | "message";
  reason: string;
  reportedBy: string;
  timestamp: Date;
}

export function createContentReport(
  contentId: string,
  contentType: "video" | "comment" | "message",
  reason: string,
  reportedBy: string
): ContentReport {
  return {
    contentId,
    contentType,
    reason,
    reportedBy,
    timestamp: new Date(),
  };
}
