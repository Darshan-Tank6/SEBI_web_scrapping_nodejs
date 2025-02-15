const express = require("express");
const puppeteer = require("puppeteer");
const path = require("path");
const { JSDOM } = require("jsdom");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Serve the HTML form page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Scraping function
// app.post("/scrape", async (req, res) => {
//   const { name, regNo, contPer, email, location } = req.body;

//   if (!name && !regNo && !contPer && !email && !location) {
//     return res.status(400).json({ error: "At least one input is required" });
//   }

//   const browser = await puppeteer.launch({ headless: false });
//   const page = await browser.newPage();

//   try {
//     console.log("Navigating to SEBI website...");
//     await page.goto(
//       "https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognisedFpi=yes&intmId=13",
//       { waitUntil: "domcontentloaded", timeout: 60000 }
//     );

//     console.log("Waiting for the form to be ready...");
//     await page.waitForSelector('input[name="name"]', { visible: true });

//     console.log("Filling the form...");
//     if (name) await page.type('input[name="name"]', name, { delay: 100 });
//     if (regNo) await page.type('input[name="regNo"]', regNo, { delay: 100 });
//     if (contPer)
//       await page.type('input[name="contPer"]', contPer, { delay: 100 });
//     if (email) await page.type('input[name="email"]', email, { delay: 100 });
//     if (location)
//       await page.type('input[name="location"]', location, { delay: 100 });

//     console.log("Waiting for search button...");
//     await page.waitForSelector("a.go-search.go_search", { visible: true });

//     console.log("Clicking search button...");
//     await page.click("a.go-search.go_search");

//     console.log("Waiting for results...");
//     await new Promise((resolve) => setTimeout(resolve, 5000));

//     // Log the full page content for debugging
//     const pageContent = await page.content();
//     console.log("Page content after search:", pageContent);

//     // Wait for results or 'No Records Found'
//     await Promise.race([
//       page
//         .waitForSelector(".fixed-table-body", { visible: true, timeout: 60000 })
//         .catch(() => null),
//       page
//         .waitForSelector(".no-records", { visible: true, timeout: 60000 })
//         .catch(() => null),
//     ]);

//     // Check if "No Records Found" message exists
//     const noRecords = await page.$(".no-records");
//     if (noRecords) {
//       console.log("No records found");
//       await browser.close();
//       return res.json({ message: "No records found" });
//     }

//     console.log("Extracting results...");
//     // Extract the entire div containing results
//     const resultsHtml = await page.evaluate(() => {
//       const resultContainer = document.querySelector(".fixed-table-body");
//       return resultContainer ? resultContainer.outerHTML : "No data found";
//     });

//     console.log("Extracted HTML:", resultsHtml);

//     // Parse extracted HTML to extract key-value pairs
//     const dom = new JSDOM(resultsHtml);
//     const document = dom.window.document;
//     const extractedData = {};

//     document.querySelectorAll(".card-view").forEach((card) => {
//       const key = card.querySelector(".title span")?.textContent.trim();
//       const value = card.querySelector(".value span")?.textContent.trim();
//       if (key && value) {
//         extractedData[key] = value;
//       }
//     });

//     console.log("Structured Data:", extractedData);

//     await browser.close();

//     // Send structured data as JSON
//     res.json({ html: resultsHtml, structuredData: extractedData });
//   } catch (error) {
//     console.error("Scraping failed:", error.message);
//     await browser.close();
//     res.status(500).json({ error: "Scraping failed", details: error.message });
//   }
// });

app.post("/scrape", async (req, res) => {
  const { name, regNo, contPer, email, location } = req.body;

  if (!name && !regNo && !contPer && !email && !location) {
    return res.status(400).json({ error: "At least one input is required" });
  }

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log("Navigating to SEBI website...");
    await page.goto(
      "https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognisedFpi=yes&intmId=13",
      { waitUntil: "domcontentloaded", timeout: 60000 }
    );

    console.log("Filling out the form...");
    if (name) await page.type('input[name="name"]', name, { delay: 100 });
    if (regNo) await page.type('input[name="regNo"]', regNo, { delay: 100 });
    if (contPer)
      await page.type('input[name="contPer"]', contPer, { delay: 100 });
    if (email) await page.type('input[name="email"]', email, { delay: 100 });
    if (location)
      await page.type('input[name="location"]', location, { delay: 100 });

    console.log("Submitting search...");
    await page.waitForSelector("a.go-search.go_search", { visible: true });
    await page.click("a.go-search.go_search");

    console.log("Waiting for results...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Extract the results container
    const resultsHtml = await page.evaluate(() => {
      const resultContainer = document.querySelector(".fixed-table-body");
      return resultContainer ? resultContainer.innerHTML : "No data found";
    });

    console.log("Parsing extracted HTML...");
    const dom = new JSDOM(resultsHtml);
    const document = dom.window.document;
    const extractedData = {};

    document.querySelectorAll(".card-view").forEach((card) => {
      const key = card.querySelector(".title span")?.textContent.trim();
      const value = card.querySelector(".value span")?.textContent.trim();
      if (key && value) {
        extractedData[key] = value;
      }
    });

    console.log("Structured Data:", extractedData);
    await browser.close();

    // Render the EJS template with the extracted data
    res.render("results", { data: extractedData });
  } catch (error) {
    console.error("Scraping failed:", error.message);
    await browser.close();
    res.status(500).json({ error: "Scraping failed", details: error.message });
  }
});

// Set up view engine for rendering results
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.listen(3000, () => console.log("Server running on port 3000"));
