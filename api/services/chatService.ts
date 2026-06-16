import Anthropic from '@anthropic-ai/sdk'
import dotenv from 'dotenv'

dotenv.config()

export class ChatService {
  static async analyzeMarket(
    messages: { role: 'user' | 'assistant'; content: string }[],
    context?: any,
    userApiKey?: string,
  ) {
    const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set. Add it to your .env file.')
    }

    const client = new Anthropic({ apiKey })

    const systemPrompt = `You are an expert Crypto Trading Assistant with deep knowledge of technical analysis, ICT concepts (Order Blocks, Fair Value Gaps, Break of Structure, AMD Sessions), and quantitative strategies.

Current market context: ${JSON.stringify(context || {})}

Guidelines:
- Be concise and specific — cite actual price levels when available in context
- Focus on technical levels, structure, and potential price action
- Always add a brief disclaimer that this is not financial advice`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    const block = response.content[0]
    if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
    return block.text
  }
}
