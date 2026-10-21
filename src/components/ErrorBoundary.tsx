import { Component, type ReactNode } from 'react';

export default class ErrorBoundary extends Component<
  { fallback: (error: Error) => ReactNode; resetKey?: unknown; children: ReactNode },
  { error: Error | null; key: unknown }
> {
  state = { error: null as Error | null, key: this.props.resetKey };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  static getDerivedStateFromProps(props: { resetKey?: unknown }, state: { key: unknown }) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }
  render() {
    return this.state.error ? this.props.fallback(this.state.error) : this.props.children;
  }
}
