import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn('[OpenAI] OPENAI_API_KEY is not set. AI features will not work.');
}

export const openai = new OpenAI({
  apiKey,
});

export default openai;


