
import { GoogleGenAI, Type } from "@google/genai";
import { ContactData, EmailTemplate } from "../types";

// Initialize client
// NOTE: In a real production app, you should not expose API keys on the client.
// You would use a proxy server. For this demo, we use process.env.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const extractContactInfo = async (imageBase64: string, ocrText: string): Promise<Partial<ContactData>> => {
  const model = "gemini-2.5-flash";
  
  // Remove data URL header if present for inlineData
  const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  const prompt = `
    Analyze this business card image and the provided OCR text to extract contact details.
    OCR Text: "${ocrText}"
    
    Extract the following fields accurately. If a field is not found, return an empty string.
    Format phone numbers internationally if possible.
    For socials, extract the full URL or handle.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fullName: { type: Type.STRING },
            title: { type: Type.STRING },
            company: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            website: { type: Type.STRING },
            address: { type: Type.STRING },
            linkedin: { type: Type.STRING },
            twitter: { type: Type.STRING },
            facebook: { type: Type.STRING },
            instagram: { type: Type.STRING },
          },
          required: ["fullName"],
        }
      }
    });

    const json = JSON.parse(response.text || "{}");
    
    return {
      fullName: json.fullName || "",
      title: json.title || "",
      company: json.company || "",
      email: json.email || "",
      phone: json.phone || "",
      website: json.website || "",
      address: json.address || "",
      socials: {
        linkedin: json.linkedin || "",
        twitter: json.twitter || "",
        facebook: json.facebook || "",
        instagram: json.instagram || "",
      }
    };

  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw new Error("Failed to analyze business card.");
  }
};

export const extractContactFromText = async (text: string): Promise<Partial<ContactData>> => {
  const prompt = `
    Analyze this text to extract contact details. It is likely a QR Code content (vCard, MeCard or raw text).
    Text Content: "${text}"
    
    Extract the following fields accurately. If a field is not found, return an empty string.
    Format phone numbers internationally if possible.
    For socials, extract the full URL or handle.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fullName: { type: Type.STRING },
            title: { type: Type.STRING },
            company: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            website: { type: Type.STRING },
            address: { type: Type.STRING },
            linkedin: { type: Type.STRING },
            twitter: { type: Type.STRING },
            facebook: { type: Type.STRING },
            instagram: { type: Type.STRING },
          },
          required: ["fullName"],
        }
      }
    });

    const json = JSON.parse(response.text || "{}");
    
    return {
      fullName: json.fullName || "",
      title: json.title || "",
      company: json.company || "",
      email: json.email || "",
      phone: json.phone || "",
      website: json.website || "",
      address: json.address || "",
      socials: {
        linkedin: json.linkedin || "",
        twitter: json.twitter || "",
        facebook: json.facebook || "",
        instagram: json.instagram || "",
      }
    };
  } catch (error) {
    console.error("Gemini Text Extraction Error:", error);
    throw new Error("Failed to extract contact from text.");
  }
};

export const generateAIContextEmail = async (
  contact: ContactData,
  template: EmailTemplate,
  context: string,
  mySignatureName: string
): Promise<{ subject: string; body: string }> => {
  
  const isShortFormat = template.category === 'SMS & Messagerie' || template.category === 'Réseaux Sociaux';

  const prompt = `
    You are a professional assistant writing a message in French.
    
    **Recipient Info:**
    Name: ${contact.fullName}
    Company: ${contact.company}
    Title: ${contact.title}
    
    **Context of interaction:**
    ${context}
    
    **Message Type / Goal:** "${template.name}"
    **Category:** ${template.category}
    
    **Sender Name:** ${mySignatureName}
    
    **Instructions:**
    1. Write the **Subject** (Objet) and the **Body** (Corps) in French.
    2. Adapt the tone to the 'Category' and 'Message Type'.
       - 'Officiel & Protocolaire': Very formal, use "Vous", protocol formulas.
       - 'Rotary': Friendly but respectful, use "Tu" if common among Rotarians, or "Vous" if unsure. Focus on service.
       - 'SMS & Messagerie': Very short, concise, no subject line needed (return empty string for subject), informal or direct.
       - 'Réseaux Sociaux': Engaging, professional but dynamic. Use hashtags if relevant.
    3. Use the specific 'Message Type' name to determine the exact content (e.g. if it says "Teaser J-60", write a teaser).
    4. Return JSON with 'subject' and 'body'.
    
    ${isShortFormat ? "Constraint: Keep the body short (under 280 chars for socials, under 160 for SMS unless it's a complex explanation)." : ""}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            body: { type: Type.STRING },
          },
          required: ["subject", "body"]
        }
      }
    });

    const json = JSON.parse(response.text || "{}");
    return {
      subject: json.subject || (isShortFormat ? "" : template.name),
      body: json.body || "Message généré..."
    };

  } catch (e) {
    console.error("Gemini Email Gen Error", e);
    // Fallback
    return {
      subject: `Message : ${template.name}`,
      body: `Bonjour ${contact.fullName},\n\nJe vous écris concernant : ${template.name}.\n\nCordialement,\n${mySignatureName}`
    };
  }
};