// When ready, add event listeners
document.addEventListener("DOMContentLoaded", () => {
  // Enable search form
  document.querySelector("#quoteSearch").disabled = false;

  // Add event listener to search form
  document.querySelector("#quoteSearch").addEventListener("submit", (e) => {
    e.preventDefault();
    searchQuotes();
  });
});

async function searchQuotes() {

  document.querySelector("#quoteResults").innerHTML = "<p>Searching...</p>";


  const query = document.querySelector("#quoteSearch input").value;
  console.log(`Searching for quote: ${query}`);
  const ranked = await NLP.rank(query, atla.targets);

  // Clear previous results
  document.querySelector("#quoteResults").innerHTML = "";

  // Add new results
  const temp = document.querySelector("#quoteTemplate");
  for (let i = 0; i < Math.min(ranked.length, 100); i++) {
    const target = ranked[i].target;
    const q = temp.content.cloneNode(true);

    const tb = q.querySelector(".quote-body");

    const lines = target.text.split("\n");
    for (let j = 0; j < lines.length; j++) {
      const line = lines[j];
      const speaker = line.split(": ")[0];
      const text = line.split(": ")[1];
      const tr = document.createElement("tr");
      tr.innerHTML = `<th>${speaker}</th><td>${text}</td>`;
      tb.appendChild(tr);
    }

    const source = `Season ${target.season}, Episode ${target.no_in_season}`;
    q.querySelector(".quote-source").innerText = source;

    // q.querySelector(".quote-body").i = target.text;
    // q.querySelector(".quote-speaker").innerText = target.speaker;
    document.querySelector("#quoteResults").appendChild(q);
  }
}
