export async function generateChatResponse(messages: { role: string; content: string }[]) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to generate chat response');
  }
  
  return response.json();
}

export async function generateSpeechUrl(text: string): Promise<string> {
  const response = await fetch('/api/voice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate speech');
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
