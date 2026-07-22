export {};

declare module 'react' {
  interface HTMLAttributes<T> {
    /** DevTools marker — identifies the React component that rendered this element. */
    component?: string;
  }
}
