// Main recommendation function
function getRecommendations() {
    const resultElement = document.getElementById('result');
    const recommendationsContainer = document.getElementById('recommendations');
    recommendationsContainer.innerHTML = ""; // clear old cards
    
    try {
        const selectElement = document.getElementById('movie-select');
        const selectedMovieId = parseInt(selectElement.value);
        
        if (isNaN(selectedMovieId)) {
            resultElement.textContent = "Please select a movie first.";
            resultElement.className = 'error';
            return;
        }
        
        const likedMovie = movies.find(movie => movie.id === selectedMovieId);
        if (!likedMovie) {
            resultElement.textContent = "Error: Selected movie not found in database.";
            resultElement.className = 'error';
            return;
        }
        
        resultElement.textContent = "Calculating recommendations using Cosine similarity...";
        resultElement.className = 'loading';
        
        setTimeout(() => {
            try {
                const likedGenres = new Set(likedMovie.genres);
                const candidateMovies = movies.filter(movie => movie.id !== likedMovie.id);
                
                // Cosine similarity scores
                const scoredMovies = candidateMovies.map(candidate => {
                    const candidateGenres = new Set(candidate.genres);
                    const intersectionSize = [...likedGenres].filter(genre => candidateGenres.has(genre)).length;
                    const score = (likedGenres.size > 0 && candidateGenres.size > 0)
                        ? intersectionSize / Math.sqrt(likedGenres.size * candidateGenres.size)
                        : 0;
                    return {
                        ...candidate,
                        score: score
                    };
                });
                
                // Sort and take top 5
                scoredMovies.sort((a, b) => b.score - a.score);
                const topRecommendations = scoredMovies.slice(0, 5);
                
                if (topRecommendations.length > 0) {
                    resultElement.textContent = `Because you liked "${likedMovie.title}", here are some recommendations:`;
                    resultElement.className = 'success';
                    
                    // Generate cards
                    topRecommendations.forEach(movie => {
                        const percentage = Math.round(movie.score * 100);
                        const card = document.createElement('div');
                        card.className = 'recommendation-card';
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
            } catch (error) {
                console.error('Error in recommendation calculation:', error);
                resultElement.textContent = "An error occurred while calculating recommendations.";
                resultElement.className = 'error';
            }
        }, 100);
    } catch (error) {
        console.error('Error in getRecommendations:', error);
        resultElement.textContent = "An unexpected error occurred.";
        resultElement.className = 'error';
    }
}
