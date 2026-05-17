import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: 'AIzaSyB4cDarz7pySqWxKJSBfokL9QGip6Z-2Jo' });
const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: 'Give me a one-sentence fun fact.',
});

console.log(response.text);
