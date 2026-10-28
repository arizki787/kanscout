import { GoogleGenAI } from "@google/genai";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import fs from "node:fs";
import { parse } from "node:path";
export interface ParsedResume {
  personalInfo: {
    fullName?: string;
    email?: string;
    phone?: string;
    location?: string;
    links?: {
      linkedin?: string;
      github?: string;
      portfolio?: string;
      twitter?: string;
    };
  };
  professionalSummary?: string;
  skills: string[];
  workExperience: Array<{
    company: string;
    role: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
    description?: string;
  }>;
  education: Array<{
    institution: string;
    degree?: string;
    fieldOfStudy?: string;
    startDate?: string;
    endDate?: string;
    gpa?: string;
  }>;
  projects: Array<{
    title: string;
    description?: string;
    technologies?: string[];
    link?: string;
    startDate?: string;
    endDate?: string;
  }>;
  certifications: Array<{
    name: string;
    issuer?: string;
    issueDate?: string;
    expiryDate?: string;
    credentialId?: string;
    credentialUrl?: string;
  }>;
}

const PARSE_PROMPT = `You are an expert resume parser. Extract information from this resume PDF and return it as a single valid JSON object with EXACTLY this structure:

{
  "personalInfo": {
    "fullName": "string or null",
    "email": "string or null",
    "phone": "string or null",
    "location": "string or null",
    "links": {  
      "linkedin": "URL string or null",
      "github": "URL string or null",
      "portfolio": "URL string or null",
      "twitter": "URL string or null"
    }
  },
  "professionalSummary": "string or null",
  "skills": ["skill1", "skill2"],
  "workExperience": [
    {
      "company": "string",
      "role": "string",
      "location": "string or null",
      "startDate": "Month Year or Year string or null",
      "endDate": "Month Year or Year string or null",
      "isCurrent": false,
      "description": "string or null"
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string or null",
      "fieldOfStudy": "string or null",
      "startDate": "Year string or null",
      "endDate": "Year string or null",
      "gpa": "string or null"
    }
  ],
  "projects": [
    {
      "title": "string",
      "description": "string or null",
      "technologies": ["tech1", "tech2"],
      "link": "URL string or null",
      "startDate": "string or null",
      "endDate": "string or null"
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuer": "string or null",
      "issueDate": "string or null",
      "expiryDate": "string or null",
      "credentialId": "string or null",
      "credentialUrl": "URL string or null"
    }
  ]
}

Rules:
- Return ONLY the JSON object, no markdown fences, no explanations.
- Use null (not empty string) for fields not found in the resume.
- For skills, extract individual skills as separate strings in the array.
- For workExperience, set isCurrent to true if the person is currently working there (e.g. "Present", "Current", no end date).
- For dates, use the format found in the resume (e.g. "Jan 2022", "2022", "January 2022 - March 2023").
- If a section is not present in the resume, use an empty array [] for list fields.`;

/**
 * Parses a resume PDF buffer using Google Gemini multimodal AI.
 * Returns structured profile data matching the 7 accordion sections.
 */


export async function extractPdfText(pdfBuffer: Buffer): Promise<string> {
  const doc = await getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
  let out = "";

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const links = (await page.getAnnotations()).filter(
      (a: any) => a.subtype === "Link" && a.url
    );
    const usedLinks = new Set<number>();

    let line = "";
    let lastY: number | null = null;

    for (const item of content.items as any[]) {
      const [, , , , x, y] = item.transform;

      if (lastY !== null && Math.abs(y - lastY) > 2) {
        out += line.trimEnd() + "\n";
        line = "";
      }
      lastY = y;

      let str: string = item.str;

      const idx = links.findIndex((a: any) => {
        const [x1, y1, x2, y2] = a.rect;
        return x >= x1 - 1 && x <= x2 + 1 && y >= y1 - 2 && y <= y2 + 2;
      });

      // attach the URL only the first time this link is hit
      if (idx !== -1 && str.trim() && !usedLinks.has(idx)) {
        usedLinks.add(idx);
        if (!str.includes(links[idx].url)) str = `${str} (${links[idx].url})`;
      }

      line += str;
    }
    out += line + "\n";

    // icon-only / unmatched links
    const orphans = links.filter((_: any, i: number) => !usedLinks.has(i));
    if (orphans.length) {
      out += "\n[Unmatched links on this page]\n";
      out += orphans.map((a: any) => `- ${a.url}`).join("\n") + "\n";
    }
    out += "\n";
  }
  return out;
}

export async function parseResumeWithGemini(
  parsed_text: string
): Promise<ParsedResume> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model,
    contents: parsed_text + PARSE_PROMPT
  });

  const text = response.text?.trim() ?? "";

  // Strip markdown fences if Gemini wraps in ```json ... ```
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let parsed: ParsedResume;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Gemini returned invalid JSON. Raw response: ${text.slice(0, 500)}`);
  }

  // Ensure all array fields are arrays (defensive)
  parsed.skills = Array.isArray(parsed.skills) ? parsed.skills : [];
  parsed.workExperience = Array.isArray(parsed.workExperience) ? parsed.workExperience : [];
  parsed.education = Array.isArray(parsed.education) ? parsed.education : [];
  parsed.projects = Array.isArray(parsed.projects) ? parsed.projects : [];
  parsed.certifications = Array.isArray(parsed.certifications) ? parsed.certifications : [];

  return parsed;
}
