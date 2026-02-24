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

        const { description } = await req.json()

        const prompt = `Gere um relatório técnico profissional, claro, objetivo e educado para um cliente final, com base na descrição técnica abaixo. Não utilize termos excessivamente técnicos.\n\nDescrição Técnica: ${description}`

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
