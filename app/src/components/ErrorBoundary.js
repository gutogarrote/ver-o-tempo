import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
            <h2 className="text-xl font-bold text-red-800 mb-4">Algo deu errado!</h2>
            <p className="text-gray-600 mb-4">
              Houve um erro na aplicação. Verifique o console do navegador para mais detalhes.
            </p>
            <div className="bg-gray-100 p-3 rounded text-sm text-gray-700 mb-4">
              {this.state.error?.toString()}
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;