
/**
 * Medical X-ray Analysis API Client
 * 
 * This module handles all API communication with the Django backend.
 * Configuration is pulled from environment variables.
 */

const API_BASE = process.env.REACT_APP_API_BASE_URL || '/api';

// API Error class for better error handling
class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'APIError';
  }
}

/**
 * Analyze an X-ray image
 * 
 * @param {File} imageFile - The image file to analyze
 * @returns {Promise<Object>} Analysis results
 * @throws {APIError} If the request fails
 */
export async function analyzeXray(imageFile) {
  if (!imageFile) {
    throw new APIError('Aucune image fournie', 400, { error: 'Aucune image fournie' });
  }

  const formData = new FormData();
  formData.append('image', imageFile);

  try {
    const response = await fetch(`${API_BASE}/analyze/`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.error || `Erreur serveur (${response.status})`;
      throw new APIError(errorMessage, response.status, data);
    }

    return data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(
      error.message || 'Erreur de connexion au serveur',
      0,
      { error: error.message }
    );
  }
}

/**
 * Retrieve the history of all X-ray analyses
 * 
 * @returns {Promise<Object>} Object with 'results' array of analyses
 * @throws {APIError} If the request fails
 */
export async function getHistory() {
  try {
    const response = await fetch(`${API_BASE}/history/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.error || 'Erreur lors de la récupération de l\'historique';
      throw new APIError(errorMessage, response.status, data);
    }

    return data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(
      'Erreur de connexion au serveur',
      0,
      { error: error.message }
    );
  }
}

/**
 * Delete an X-ray analysis by ID
 * 
 * @param {number} id - The analysis ID to delete
 * @returns {Promise<void>}
 * @throws {APIError} If the request fails
 */
export async function deleteAnalysis(id) {
  if (!id) {
    throw new APIError('ID d\'analyse manquant', 400, { error: 'ID manquant' });
  }

  try {
    const response = await fetch(`${API_BASE}/history/${id}/`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      let data = {};
      try {
        data = await response.json();
      } catch (e) {
        // Response might not be JSON for 204 No Content
      }
      const errorMessage = data.error || 'Erreur lors de la suppression';
      throw new APIError(errorMessage, response.status, data);
    }

    return response.status === 204 ? null : await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(
      'Erreur de connexion au serveur',
      0,
      { error: error.message }
    );
  }
}

/**
 * Get the API base URL (useful for debugging)
 * @returns {string} The API base URL
 */
export function getAPIBaseURL() {
  return API_BASE;
}

export { APIError };
