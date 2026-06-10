'use client'

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    console.error('[MEDHĀ Error Boundary]', error)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="fixed inset-0 bg-black flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-white/40 text-sm tracking-[0.2em] uppercase">
              The void encountered an anomaly
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="text-white/25 text-xs tracking-widest uppercase border border-white/10 px-4 py-2 rounded-lg hover:border-white/20 transition-colors"
            >
              Reconnect
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
