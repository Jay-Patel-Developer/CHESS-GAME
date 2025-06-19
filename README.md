# Chess Game

A modern chess game implementation built with React, TypeScript, and Vite. Play chess with a clean, intuitive interface and enjoy features like move validation, piece capture sounds, and more.

## Features

- ♟️ Full chess game implementation with standard rules
- 🎵 Sound effects for moves, captures, and special events
- 🎨 Clean, responsive UI design
- ⚡ Built with modern tech stack (React + TypeScript + Vite)
- 🏃‍♂️ Fast performance with Hot Module Replacement (HMR)
- 🎮 Drag and drop piece movement
- ✨ Move validation and highlighting

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/chess-game.git
cd chess-game
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

## Tech Stack

- React 18
- TypeScript 5
- Vite 5
- ESLint for code quality
- CSS Modules for styling

## Project Structure

```
chess-game/
├── public/
│   └── sounds/          # Game sound effects
├── src/
│   ├── components/      # React components
│   ├── utils/          # Utility functions
│   ├── types/          # TypeScript type definitions
│   └── App.tsx         # Root component
```

## Development

### ESLint Configuration

The project uses ESLint with TypeScript support. To enable type-aware lint rules:

```js
// eslint.config.js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Sound effects from [source-of-your-sounds]
- Chess piece designs from [source-of-designs]
