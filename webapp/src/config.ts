// Application configuration
// Reads from environment variables set in .env file

export const config = {
  openai: {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  },
  chroma: {
    apiKey: import.meta.env.VITE_CHROMA_API_KEY || '',
    tenant: import.meta.env.VITE_CHROMA_TENANT || '',
    database: import.meta.env.VITE_CHROMA_DATABASE || '',
  },
};

// Validate that required keys are present
if (!config.openai.apiKey) {
  console.error('VITE_OPENAI_API_KEY environment variable is not set');
}

if (!config.chroma.apiKey || !config.chroma.tenant || !config.chroma.database) {
  console.warn('Chroma Cloud configuration is incomplete. Vector search may not work properly.');
}
