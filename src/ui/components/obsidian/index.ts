export type BuilderProps<T> = {
  build: (instance: T) => void;
  deps?: readonly unknown[];
};

export * from './components';
export * from './Setting';
