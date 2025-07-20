export const techNames = {
    // Frontend
    react: "React (JS библиотека)",
    nextjs: "Next.js (React‑фреймворк)",
    vue: "Vue.js (прогрессивный фреймворк)",
    nuxtjs: "Nuxt.js (Vue‑фреймворк)",
    preact: "Preact (легковесный React)",

    // Backend
    node: "Node.js (серверный JS)",
    nestjs: "NestJS (Node‑фреймворк)",
    express: "Express.js (веб‑фреймворк)",

    // Databases
    mongodb: "MongoDB (NoSQL)",
    postgresql: "PostgreSQL (SQL)",
    mysql: "MySQL (реляционная)",

    // Languages
    typescript: "TypeScript",
    javascript: "JavaScript",
    python: "Python",
    go: "Go (Golang)",
    rust: "Rust",

    // State Management
    mobx: "MobX",
    redux: "Redux",

    // Tools & Other
    docker: "Docker",
    graphql: "GraphQL",
    webpack: "Webpack",
    jest: "Jest",
    git: "Git",
    kubernetes: "Kubernetes",
} as const;

export type TechName = keyof typeof techNames;
