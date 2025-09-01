
const { v4: uuidv4 } = require('uuid');

function generateMetadata(query, location, language, timeTaken) {
  const googleUrl = buildGoogleSearchUrl(query, location, language);
  
  return {
    id: uuidv4(),
    status: 'Success',
    google_url: googleUrl,
    created_at: new Date().toISOString(),
    processed_at: new Date().toISOString(),
    time_taken: timeTaken
  };
}

function buildGoogleSearchUrl(query, location, language) {
  const baseUrl = 'https://www.google.com/search';
  const params = new URLSearchParams();
  
  params.append('q', query);
  params.append('hl', language || 'es');
  
  if (location) {
    params.append('near', location);
  }
  
  return `${baseUrl}?${params.toString()}`;
}

function handleError(error) {
  console.error('Error capturado:', error);
  
  // Errores específicos de Google
  if (error.message.includes('blocked') || error.message.includes('captcha')) {
    return {
      error: {
        code: 429,
        message: 'Demasiadas solicitudes. Google ha bloqueado temporalmente las peticiones.',
        type: 'rate_limit_exceeded'
      }
    };
  }
  
  // Error de timeout
  if (error.message.includes('timeout') || error.message.includes('Navigation timeout')) {
    return {
      error: {
        code: 408,
        message: 'Tiempo de espera agotado. Intente nuevamente.',
        type: 'timeout_error'
      }
    };
  }
  
  // Error de red
  if (error.message.includes('net::') || error.message.includes('network')) {
    return {
      error: {
        code: 503,
        message: 'Error de conexión de red. Verifique su conexión a internet.',
        type: 'network_error'
      }
    };
  }
  
  // Error genérico
  return {
    error: {
      code: 500,
      message: 'Error interno del servidor durante el scraping.',
      type: 'internal_error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }
  };
}

function validateSearchParams(params) {
  const errors = [];
  
  if (!params.q || typeof params.q !== 'string' || params.q.trim().length === 0) {
    errors.push('El parámetro "q" (query) es requerido y debe ser una cadena no vacía');
  }
  
  if (params.q && params.q.length > 500) {
    errors.push('El parámetro "q" no puede exceder 500 caracteres');
  }
  
  if (params.location && typeof params.location !== 'string') {
    errors.push('El parámetro "location" debe ser una cadena');
  }
  
  if (params.hl && typeof params.hl !== 'string') {
    errors.push('El parámetro "hl" debe ser una cadena');
  }
  
  return errors;
}

module.exports = {
  generateMetadata,
  handleError,
  validateSearchParams,
  buildGoogleSearchUrl,
};
