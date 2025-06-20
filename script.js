// This script handles the URL shortening functionality and displays the shortened URLs.

// Fetches the list of shortened URLs from the server and displays them in the result list.
async function fetchShortenedUrl() {
  try {
    const response = await fetch("/links").then((res) => res.json());
    if (response && Object.keys(response)?.length > 0) {
      for (const [shortCode, link] of Object.entries(response)) {
        document.querySelector(".result-list").innerHTML += `
          <li>
          <a href="${window.location.origin}/${shortCode}" target="_blank">${window.location.origin}/${shortCode}</a>--->
          ${link}
          </li>`;
      }
    }
  } catch (error) {
    console.error("Error fetching shortened URLs:", error);
    document.querySelector(".result-list").innerHTML =
      "<li>Error loading links</li>";
    return;
  }
}

fetchShortenedUrl();

// Adds an event listener to the form submission to handle URL shortening.
document
  .getElementById("url-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    // Collect form data and send it to the server to shorten the URL
    const formData = new FormData(event.target);
    const url = formData.get("url");
    const shortCode = formData.get("shortCode");

    try {
      const response = await fetch("/shorten", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, shortCode }),
      });

      const data = await response.json();
      if (response.ok) {
        event.target.reset();

        const resultList = document.querySelector(".result-list");
        resultList.innerHTML = ""; // Clear existing entries
        fetchShortenedUrl();
      } else {
        throw new Error(data.error || "Failed to shorten URL");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred while shortening the URL. Please try again.");
    }
  });
