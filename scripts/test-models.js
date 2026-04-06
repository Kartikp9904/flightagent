const fs = require('fs');

async function checkModels() {
  try {
    const env = fs.readFileSync('.env.local', 'utf8');
    const keyMatch = env.match(/GEMINI_API_KEY=(.+)/);
    const key = keyMatch[1].trim();

    console.log("\x1b[36m[DIAGNOSTICS]\x1b[0m Querying Google AI endpoint for supported models...");
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await response.json();

    if (data.error) {
      console.error("\x1b[31m[API ERROR]:\x1b[0m", data.error.message);
      return;
    }

    console.log("\x1b[32m[OFFICIAL MODEL NAMES]:\x1b[0m");
    const models = data.models || [];
    let requestedExists = false;

    models.forEach(m => {
      const shortName = m.name.replace('models/', '');
      console.log(` - ${shortName}`);
      if (shortName === "gemini-2.5-flash") requestedExists = true;
    });

    if (!requestedExists) {
      console.warn("\x1b[33m[NOTICE]\x1b[0m 'gemini-2.5-flash' is not in this list.");
      console.log("\x1b[32m[SUGGESTION]\x1b[0m Try 'gemini-1.5-flash' or check for 'gemini-2.0-flash-exp'. success. (Go! Go! Go!)");
    }

  } catch (err) {
    console.error("\x1b[31m[FETCH FAILURE]:\x1b[0m", err.message);
  }
}

checkModels();
