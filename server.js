// Url Shortener Server
// This server allows users to shorten URLs and retrieve them using short codes.
import { createServer } from "http";
import { existsSync, mkdirSync } from "fs";
import { extname } from "path";
import { readFile, writeFile } from "fs/promises";

const folderPath = "./data";
const jsonFilePath = `${folderPath}/links.json`;

// Ensure the data folder exists and create it if not
async function ensureDataFolder() {
  if (!existsSync(folderPath)) {
    mkdirSync(folderPath);
    console.log(`Folder created: ${folderPath}`);
  }
}

//// Load links from the JSON file, creating it if it doesn't exist
async function loadLinks() {
  try {
    const data = await readFile(jsonFilePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      await ensureDataFolder();
      await writeFile(jsonFilePath, "{}", "utf-8");
      console.log("Links file created.");
      return {};
    } else {
      throw err;
    }
  }
}

// Save links to the JSON file
async function saveLinks(links) {
  try {
    await writeFile(jsonFilePath, JSON.stringify(links, null, 2), "utf-8");
    console.log("Links saved successfully.");
  } catch (err) {
    console.error("Error saving links:", err);
  }
}

const server = createServer(async (req, res) => {
  if (req.method === "GET") {
    let filePath = `.${req.url}`;
    if (filePath === "./") filePath = "./index.html";

    // Determine the content type based on the file extension
    await ensureDataFolder(); // Ensure the data folder exists
    const ext = extname(filePath);
    let contentType = "text/html";

    // Set content type based on file extension
    switch (ext) {
      case ".css":
        contentType = "text/css";
        break;
      case ".js":
        contentType = "text/javascript";
        break;
    }

    // Serve static files if they match the expected paths
    // or if they are the index.html, style.css, or script.js files
    if (
      filePath === "./style.css" ||
      filePath === "./script.js" ||
      filePath === "./index.html"
    ) {
      try {
        const data = await readFile(filePath);
        res.writeHead(200, { "Content-Type": contentType });
        res.end(data);
      } catch (err) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Error loading file");
      }
    }
    // Handle the /links endpoint to return all shortened links
    else if (req.url === "/links") {
      try {
        const links = await loadLinks();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(links ? JSON.stringify(links) : "{}");
      } catch (error) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to retrieve links" }));
      }
    }
    // Handle the short code redirection
    else {
      const links = await loadLinks();
      const shortCode = req.url.slice(1); // Remove leading slash
      const originalUrl = links[shortCode];
      if (originalUrl) {
        res.writeHead(302, { location: originalUrl });
        res.end();
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Link not found" }));
      }
    }
  }

  // Handle POST requests to shorten URLs
  else if (req.method === "POST" && req.url === "/shorten") {
    const links = await loadLinks();
    let body = "";

    req.on("data", (chunk) => (body += chunk.toString())); // Collect data chunks
    req.on("end", async () => {
      // Process the collected data

      try {
        const { url, shortCode } = JSON.parse(body);

        // Validate the input

        if (!url) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "URL is required" }));
          return;
        }

        // Generate a short code if not provided

        const finalShortCode =
          shortCode || Math.random().toString(36).substring(2, 8);

        // Check if the short code already exists
        if (links[finalShortCode]) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Short code already exists" }));
          return;
        }

        // Save the new link
        links[finalShortCode] = url;
        await saveLinks(links);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            shortenedUrl: `http://localhost:${PORT}/${finalShortCode}`,
          })
        );
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to shorten URL" }));
      }
    }); // End of data collection
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
