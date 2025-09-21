let movies = [];

// Genre names from MovieLens 100k dataset (u.item file)
const GENRES = [
    "unknown","Action","Adventure","Animation","Children","Comedy","Crime",
    "Documentary","Drama","Fantasy","Film-Noir","Horror","Musical","Mystery",
    "Romance","Sci-Fi","Thriller","War","Western"
];

// Load and parse u.item file
async function loadData() {
    try {
        const response = await fetch("u.item");
        const text = await response.text();
        const lines = text.trim().split("\n");

        movies = lines.map(line => {
            const parts = line.split("|");
            const id = parseInt(parts[0]);
            const title = parts[1];
            const flags = parts.slice(5).map(Number);
            const genres = GENRES.filter((g, i) => flags[i] === 1);
            return { id, title, genres };
        });

    } catch (error) {
        const resultElement = document.getElementById('result');
        resultElement.textContent = "Failed to load movie data.";
        resultElement.className = 'error';
        console.error("Error loading data:", error);
    }
}

// Initialize app
window.onload = async function() {
    const resultElement = document.getElementById('result');
    resultElement.textContent = "Loading movie data...";
    resultElement.className = 'loading';

    await loadData();

    if (movies.length > 0) {
        populateMoviesDropdown();
        resultElement.textContent = "Data loaded. Please select a movie.";
        resultElement.className = 'success';
    } else {
        resultElement.textContent = "No movies loaded.";
        resultElement.className = 'error';
    }
};

// Populate dropdown
function populateMoviesDropdown() {
    const selectElement = document.getElementById('movie-select');
    while (selectElement.options.length > 1) selectElement.remove(1);

    const sortedMovies = [...movies].sort((a, b) => a.title.localeCompare(b.title));
    sortedMovies.forEach(movie => {
        const option = document.createElement('option');
        option.value = movie.id;
        option.textContent = movie.title;
        selectElement.appendChild(option);
    });
}

// Recommendation function (cosine similarity + cards)
function getRecommendations() {
    const resultElement = document.getElementById('result');
    const recommendationsContainer = document.getElementById('recommendations');
    recommendationsContainer.innerHTML = "";

    try {
        const selectElement = document.getElementById('movie-select');
        const selectedMovieId = parseInt(selectElement.value);

        if (isNaN(selectedMovieId)) {
            resultElement.textContent = "Please select a movie first.";
            resultElement.className = 'error';
            return;
        }

        const likedMovie = movies.find(m => m.id === selectedMovieId);
        if (!likedMovie) {
            resultElement.textContent = "Error: Selected movie not found.";
            resultElement.className = 'error';
            return;
        }

        resultElement.textContent = "Calculating recommendations...";
        resultElement.className = 'loading';

        setTimeout(() => {
            const likedGenres = new Set(likedMovie.genres);
            const candidates = movies.filter(m => m.id !== likedMovie.id);

            const scoredMovies = candidates.map(candidate => {
                const candidateGenres = new Set(candidate.genres);
                const intersectionSize = [...likedGenres].filter(g => candidateGenres.has(g)).length;
                const score = (likedGenres.size && candidateGenres.size)
                    ? intersectionSize / Math.sqrt(likedGenres.size * candidateGenres.size)
                    : 0;
                return { ...candidate, score };
            });

            scoredMovies.sort((a, b) => b.score - a.score);
            const topRecommendations = scoredMovies.slice(0, 5);

            if (topRecommendations.length > 0) {
                resultElement.textContent = `Because you liked "${likedMovie.title}", here are recommendations:`;
                resultElement.className = 'success';

                topRecommendations.forEach(movie => {
                    const percentage = Math.round(movie.score * 100);
                    const card = document.createElement("div");
                    card.className = "recommendation-card";
                    card.innerHTML = `
                        <span class="emoji">🎬</span>
                        <div class="info">
                            <h3>${movie.title}</h3>
                            <p>Similarity: ${percentage}%</p>
                        </div>
                    `;
                    recommendationsContainer.appendChild(card);
                });
            } else {
                resultElement.textContent = `No recommendations found for "${likedMovie.title}".`;
                resultElement.className = 'error';
            }
        }, 100);

    } catch (error) {
        console.error("Error in getRecommendations:", error);
        resultElement.textContent = "An unexpected error occurred.";
        resultElement.className = 'error';
    }
}
