export const handler = async (event: any, context: any) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello from Netlify Functions!", time: new Date().toISOString() }),
    headers: {
      "Content-Type": "application/json"
    }
  };
};
