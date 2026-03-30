/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      let isFirestoreError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            errorMessage = `Erro no Firestore (${parsed.operationType}): ${parsed.error}`;
            isFirestoreError = true;
          }
        }
      } catch (e) {
        // Not a JSON error message
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
          <div className="w-full max-w-md space-y-6 rounded-3xl bg-white p-8 shadow-xl ring-1 ring-gray-200">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 mx-auto">
              <AlertCircle className="h-10 w-10" />
            </div>
            
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">Ops! Algo deu errado</h2>
              <p className="mt-2 text-sm text-gray-600">
                {errorMessage}
              </p>
            </div>

            {isFirestoreError && (
              <div className="rounded-xl bg-amber-50 p-4 text-xs text-amber-800 leading-relaxed">
                Parece haver um problema com as permissões ou conexão do banco de dados. 
                Se você for o administrador, verifique as regras de segurança do Firestore.
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 active:scale-[0.98]"
            >
              <RefreshCw className="h-4 w-4" />
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
