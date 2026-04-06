import { chromium } from "playwright";

export interface ScrapeStep {
  type: "log";
  message: string;
}

export async function scrapeFlights(
  origin: string, 
  destination: string, 
  date: string, 
  onStep: (step: string) => void
): Promise<string> {
  onStep(`Initializing intelligent agent for ${origin} to ${destination}...`);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  });
  const page = await context.newPage();

  try {
    const searchUrl = `https://www.google.com/travel/flights?q=Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(destination)}%20on%20${date}`;
    
    onStep(`Navigating to flight search engine...`);
    await page.goto(searchUrl, { waitUntil: "networkidle" });

    onStep(`Scrolling results for a complete search...`);
    await page.evaluate(() => window.scrollBy(0, 1000));
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollBy(0, 1000));

    onStep(`Waiting for visual stability and dynamic pricing...`);
    await page.waitForTimeout(5000); // 5s buffer for dynamic prices

    onStep(`Extracting all available flight data row-by-row...`);
    
    // Extract each flight row independently for maximum accuracy
    // Google Flights has moved away from role="listitem" to a div/button hybrid
    const resultsText = await page.evaluate(() => {
      // Find elements that look like they contain flight info
      const allElements = Array.from(document.querySelectorAll('div, li, [role="button"]'));
      
      const potentialRows = allElements.filter(el => {
        const text = (el as HTMLElement).innerText;
        // A valid flight row must have a time (AM/PM), a duration (hr), and a price symbol
        return text.length > 50 && 
               text.length < 1000 && // Avoid capturing the entire page
               (text.includes("AM") || text.includes("PM") || text.includes("–")) && 
               (text.includes("₹") || text.includes("Rs") || text.includes("$") || text.includes("€")) &&
               (text.includes("stop") || text.includes("Nonstop"));
      });

      // Filter and de-duplicate to find only the deepest unique rows
      return potentialRows
        .map(row => (row as HTMLElement).innerText)
        .filter((text, index, self) => self.indexOf(text) === index) // De-duplicate identical text
        .join("\n====FLIGHT_ROW====\n");
    });

    if (!resultsText || resultsText.split("====FLIGHT_ROW====").length < 2) {
      throw new Error("CAUSE: NO_RESULTS");
    }

    onStep(`Live data successfully captured. Now parsing with AI...`);
    
    return resultsText;
  } catch (error: unknown) {
    if (error instanceof Error && (error.message?.includes("Timeout") || error.message?.includes("timeout"))) {
      throw new Error("CAUSE: TIMEOUT");
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown scraping error";
    onStep(`Error during scraping: ${errorMessage}`);
    throw error;
  } finally {
    await browser.close();
  }
}
