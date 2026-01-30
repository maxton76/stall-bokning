/**
 * Gemini AI Utility
 *
 * Uses Vertex AI SDK with Application Default Credentials.
 * No API key needed — uses service account in Cloud Run,
 * and `gcloud auth application-default login` locally.
 */

import { VertexAI } from "@google-cloud/vertexai";

const projectId = process.env.GCP_PROJECT_ID || "equiduty-dev";
const location = process.env.GCP_LOCATION || "europe-west1";

const vertexAI = new VertexAI({ project: projectId, location });

const model = vertexAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

const FEATURE_REQUEST_PROMPT = `You are a writing assistant for EquiDuty — a Swedish SaaS platform that helps stable owners and horse enthusiasts manage daily stable chores through a fair, weight-based booking system. Users include stable owners, riders, grooms, and other equestrian professionals. The platform handles scheduling, horse management, billing, and communication between stable members.

Your task is to refine a feature request submitted by a user. Improve the clarity, structure, and readability while keeping the original intent.

Rules:
- Keep the original intent and meaning intact
- Respond in the SAME language as the input (Swedish or English)
- Make the title concise and descriptive (max 200 characters)
- Structure the description clearly, using short paragraphs if needed
- Use equestrian terminology accurately when present in the original
- Do not add information that wasn't in the original
- Do not add markdown formatting
- Return ONLY valid JSON in this exact format: {"title": "...", "description": "..."}`;

const SUPPORT_TICKET_PROMPT = `You are a writing assistant for EquiDuty — a Swedish SaaS platform that helps stable owners and horse enthusiasts manage daily stable chores through a fair, weight-based booking system. Users include stable owners, riders, grooms, and other equestrian professionals. The platform handles scheduling, horse management, billing, and communication between stable members.

Your task is to refine a support ticket submission. Improve the clarity and structure so that the support team can understand and resolve the issue faster.

Rules:
- Keep the original intent and meaning intact
- Respond in the SAME language as the input (Swedish or English)
- Make the subject concise and descriptive (max 200 characters)
- Structure the message clearly: describe the problem, steps to reproduce if applicable, and expected behavior
- Use equestrian terminology accurately when present in the original
- Do not add information that wasn't in the original
- Do not add markdown formatting
- Return ONLY valid JSON in this exact format: {"subject": "...", "message": "..."}`;

const SUPPORT_REPLY_PROMPT = `You are a writing assistant for EquiDuty — a Swedish SaaS platform that helps stable owners and horse enthusiasts manage daily stable chores through a fair, weight-based booking system. Users include stable owners, riders, grooms, and other equestrian professionals. The platform handles scheduling, horse management, billing, and communication between stable members.

Your task is to refine a user's reply in a support ticket conversation. Improve the clarity and professionalism of the message.

Rules:
- Keep the original intent and meaning intact
- Respond in the SAME language as the input (Swedish or English)
- Make the message clear, polite, and well-structured
- Use equestrian terminology accurately when present in the original
- Do not add information that wasn't in the original
- Do not add markdown formatting
- Return ONLY valid JSON in this exact format: {"message": "..."}`;

async function callGemini(
  systemPrompt: string,
  userPrompt: string,
): Promise<Record<string, unknown>> {
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  });

  const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No response from Gemini");
  }

  return JSON.parse(text);
}

export async function refineFeatureRequestText(
  title: string,
  description: string,
): Promise<{ title: string; description: string }> {
  const parsed = await callGemini(
    FEATURE_REQUEST_PROMPT,
    `Refine this feature request:\n\nTitle: ${title}\n\nDescription: ${description}`,
  );

  if (
    typeof parsed.title !== "string" ||
    typeof parsed.description !== "string"
  ) {
    throw new Error("Invalid response format from Gemini");
  }

  return {
    title: (parsed.title as string).slice(0, 200),
    description: (parsed.description as string).slice(0, 5000),
  };
}

export async function refineSupportTicketText(
  subject: string,
  message: string,
): Promise<{ subject: string; message: string }> {
  const parsed = await callGemini(
    SUPPORT_TICKET_PROMPT,
    `Refine this support ticket:\n\nSubject: ${subject}\n\nMessage: ${message}`,
  );

  if (
    typeof parsed.subject !== "string" ||
    typeof parsed.message !== "string"
  ) {
    throw new Error("Invalid response format from Gemini");
  }

  return {
    subject: (parsed.subject as string).slice(0, 200),
    message: (parsed.message as string).slice(0, 10000),
  };
}

export async function refineSupportReplyText(
  message: string,
): Promise<{ message: string }> {
  const parsed = await callGemini(
    SUPPORT_REPLY_PROMPT,
    `Refine this support ticket reply:\n\n${message}`,
  );

  if (typeof parsed.message !== "string") {
    throw new Error("Invalid response format from Gemini");
  }

  return {
    message: (parsed.message as string).slice(0, 10000),
  };
}
