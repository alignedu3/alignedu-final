// utils/openai.ts

import { OpenAI } from 'openai';  // Correct import for OpenAI class

// Create an instance of the OpenAI client with your API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,  // Get the API key from the environment variables
});

// Function to get feedback from ChatGPT based on the text input
export async function getChatGPTFeedback(text: string) {
  try {
    // Create a chat completion request to OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4', // You can change this to 'gpt-3.5' if you prefer
      messages: [
        {
          role: 'user',
          content: `Please provide constructive feedback on this lesson plan: ${text}`,
        },
      ],
    });

    // Return the feedback from the model
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error with OpenAI API:', error);
    return 'Error analyzing lesson plan.';
  }
}
