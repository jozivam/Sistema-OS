
import { GoogleGenAI } from "@google/genai";

export const generateProfessionalReport = async (description: string): Promise<string> => {
  try {
    // Initializing GoogleGenAI with process.env.API_KEY directly as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere um relatório técnico profissional, claro, objetivo e educado para um cliente final, com base na descrição técnica abaixo. Não utilize termos excessivamente técnicos.\n\nDescrição Técnica: ${description}`,
    });

    // Accessing .text property directly from GenerateContentResponse as per guidelines
    return response.text || "Não foi possível gerar o relatório. Tente novamente.";
  } catch (error) {
    console.error("AI Generation error:", error);
    return "Erro ao conectar com a IA. Verifique sua conexão ou tente mais tarde.";
  }
};
