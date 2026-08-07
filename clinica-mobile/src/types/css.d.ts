// O template do Expo (SDK 57) usa CSS (global.css e CSS Modules), resolvido pelo
// Metro em runtime. O `tsc` puro não conhece esses imports — estas declarações
// evitam falsos erros de tipo (TS2307/TS2882) sem afetar o build real.
declare module '*.css';

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
