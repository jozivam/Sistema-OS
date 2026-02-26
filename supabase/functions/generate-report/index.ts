import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') ?? '')
        const model = genAI.getGenerativeModel({ model: "gemini-pro" })

        const { description, history } = await req.json()

        const prompt = `Atue como um Especialista Técnico de Manutenção Sênior. Sua tarefa é analisar o relato original do cliente e o diário de bordo técnico para redigir um "Relatório Técnico Final" polido, profissional, claro e objetivo.
O relatório será entregue ao cliente final. Evite jargões excessivamente complexos quando possível, mas mantenha a precisão técnica. Formate o relatório usando Markdown (com blocos, listas, subtítulos se necessário) para fácil leitura.

---
**Solicitação/Relato Original:**
${description || 'Não informado.'}

**Diário de Atividades / Acompanhamento Técnico:**
${history || 'Nenhuma nota técnica registrada.'}
---

Gere apenas o relatório final em Markdown, sem introduções extras ou conversas paralelas.`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        return new Response(
            JSON.stringify({ text }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})
