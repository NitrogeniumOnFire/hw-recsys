let movies = [];
let userRatings = {};

// Genre names from MovieLens 100k dataset
const GENRES = [
    "unknown","Action","Adventure","Animation","Children","Comedy","Crime",
    "Documentary","Drama","Fantasy","Film-Noir","Horror","Musical","Mystery",
    "Romance","Sci-Fi","Thriller","War","Western"
];

// Load and parse u.item + u.data
async function loadData() {
    try {
        // Load movies
        const itemResponse = await fetch("u.item");
        const itemText = await itemResponse.text();
        const itemLines = itemText.trim().split("\n");

        movies = itemLines.map(line => {
            const parts = line.split("|");
            const id = parseInt(parts[0]);
            const title = parts[1];
            const flags = parts.slice(5).map(Number);
            const genres = GENRES.filter((g, i) => flags[i] === 1);
            return { id, title, genres };
        });

        // Load ratings
        const dataResponse = await fetch("u.data");
        const dataText = await dataResponse.text();
        const dataLines = dataText.trim().split("\n");

        userRatings = {};
        dataLines.forEach(line => {
            const [userId, movieId, rating] = line.split("\t").map(Number);
            if (!userRatings[userId]) userRatings[userId] = {};
            userRatings[userId][movieId] = rating;
        });

    } catch (error) {
        const resultElement = document.getElementById("result");
        resultElement.textContent = "Failed to load movie data.";
        resultElement.className = "error";
        console.error("Error loading data:", error);
    }
}

// Initialize app
window.onload = async function () {
    const resultElement = document.getElementById("result");
    resultElement.textContent = "Loading movie data...";
    resultElement.className = "loading";

    await loadData();

    if (movies.length > 0) {
        populateMoviesDropdown();
        resultElement.textContent = "Data loaded. Please select a movie.";
        resultElement.className = "success";
    } else {
        resultElement.textContent = "No movies loaded.";
        resultElement.className = "error";
    }
};

// Populate dropdown
function populateMoviesDropdown() {
    const selectElement = document.getElementById("movie-select");
    while (selectElement.options.length > 1) selectElement.remove(1);

    const sortedMovies = [...movies].sort((a, b) =>
        a.title.localeCompare(b.title)
    );
    sortedMovies.forEach(movie => {
        const option = document.createElement("option");
        option.value = movie.id;
        option.textContent = movie.title;
        selectElement.appendChild(option);
    });
}

// Recommendation function (hybrid)
function getRecommendations() {
    const resultElement = document.getElementById("result");
    const recommendationsContainer = document.getElementById("recommendations");
    recommendationsContainer.innerHTML = "";

    try {
        const selectElement = document.getElementById("movie-select");
        const selectedMovieId = parseInt(selectElement.value);

        if (isNaN(selectedMovieId)) {
            resultElement.textContent = "Please select a movie first.";
            resultElement.className = "error";
            return;
        }

        const likedMovie = movies.find(m => m.id === selectedMovieId);
        if (!likedMovie) {
            resultElement.textContent = "Error: Selected movie not found.";
            resultElement.className = "error";
            return;
        }

        resultElement.textContent = "Calculating hybrid recommendations...";
        resultElement.className = "loading";

        setTimeout(() => {
            // --- Content-based similarity ---
            const likedGenres = new Set(likedMovie.genres);
            const contentScores = {};
            movies.forEach(candidate => {
                if (candidate.id !== likedMovie.id) {
                    const candidateGenres = new Set(candidate.genres);
                    const intersectionSize = [...likedGenres].filter(g =>
                        candidateGenres.has(g)
                    ).length;
                    const score =
                        likedGenres.size && candidateGenres.size
                            ? intersectionSize /
                              Math.sqrt(
                                  likedGenres.size * candidateGenres.size
                              )
                            : 0;
                    contentScores[candidate.id] = score;
                }
            });

            // --- Collaborative filtering similarity ---
            const collaborativeScores = {};
            const usersWhoLiked = Object.entries(userRatings).filter(
                ([, ratings]) => ratings[selectedMovieId] >= 4
            );

            usersWhoLiked.forEach(([, ratings]) => {
                for (const [movieId, rating] of Object.entries(ratings)) {
                    if (parseInt(movieId) !== likedMovie.id) {
                        collaborativeScores[movieId] =
                            (collaborativeScores[movieId] || 0) + rating;
                    }
                }
            });

            // Normalize collaborative scores
            const maxRating = Math.max(...Object.values(collaborativeScores), 1);
            for (const movieId in collaborativeScores) {
                collaborativeScores[movieId] /= maxRating;
            }

            // --- Hybrid score = weighted average (50/50) ---
            const hybridScores = movies
                .filter(m => m.id !== likedMovie.id)
                .map(m => {
                    const cScore = contentScores[m.id] || 0;
                    const cfScore = collaborativeScores[m.id] || 0;
                    const finalScore = 0.5 * cScore + 0.5 * cfScore;
                    return { ...m, score: finalScore };
                });

            hybridScores.sort((a, b) => b.score - a.score);
            const topRecommendations = hybridScores.slice(0, 5);

            if (topRecommendations.length > 0) {
                resultElement.textContent = `Because you liked "${likedMovie.title}", here are hybrid recommendations:`;
                resultElement.className = "success";

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
                resultElement.className = "error";
            }
        }, 100);
    } catch (error) {
        console.error("Error in getRecommendations:", error);
        resultElement.textContent = "An unexpected error occurred.";
        resultElement.className = "error";
    }
}
