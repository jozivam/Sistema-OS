import { supabase } from './supabaseClient';

export const generateProfessionalReport = async (description: string): Promise<string> => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-report', {
      body: { description }
    });

    if (error) throw error;
    return data.text || "Não foi possível gerar o relatório. Tente novamente.";
  } catch (error) {
    console.error("AI Generation error:", error);
    return "Erro ao conectar com a IA. O serviço de IA pode estar sendo ativado em produção.";
  }
};
