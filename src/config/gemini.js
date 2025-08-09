import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

const MODEL_NAME = "gemini-1.5-flash"; // Using flash for higher free tier limits
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// Rate limiting variables
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 4000; // 4 seconds between requests (15 per minute max)

async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    console.log(`Rate limiting: waiting ${waitTime}ms before next request...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
}

async function runChat(prompt) {
  try {
    // Check if API key exists
    if (!API_KEY) {
      throw new Error("API key not found. Please set VITE_GOOGLE_API_KEY environment variable.");
    }

    // Wait to respect rate limits
    await waitForRateLimit();

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const generationConfig = {
      temperature: 0.9,
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048,
    };

    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];

    const chat = model.startChat({
      generationConfig,
      safetySettings,
      history: [],
    });

    console.log("Sending request to Gemini API...");
    const result = await chat.sendMessage(prompt);
    const response = result.response;
    
    console.log("Response received successfully");
    return response.text();
    
  } catch (error) {
    if (error.message.includes('429')) {
      console.error("Rate limit exceeded. Please wait before making another request.");
      throw new Error("Too many requests. Please wait a moment and try again.");
    }
    console.error("Error in runChat:", error);
    throw error;
  }
}

export default runChat;