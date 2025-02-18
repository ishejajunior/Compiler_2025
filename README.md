# Compiler_2025

A recursive descent compiler implementation for Alan++ language.

## Description

This project implements a recursive descent compiler that translates Alan++ into Machine Code. The compiler follows standard compilation phases including lexical analysis, parsing, semantic analysis, and code generation.

## Features

- Lexical analysis (tokenization)
- Recursive descent parsing
- Abstract Syntax Tree (AST) construction
- Semantic analysis
- Code generation for target machine code

## Getting Started

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ishejajunior/Compiler_2025
   cd Compiler_2025
   ```
2. Compile the TypeScript code:
   ```bash
   tsc
   ```

## Project Structure

### Source Code

- `src/`: TypeScript source files
  - `Lexer.ts`: Tokenization and lexical analysis
  - `Parser.ts`: Recursive descent parsing implementation
  - `AST.ts`: Abstract Syntax Tree definitions and construction
  - `CodeGenerator.ts`: Machine code generation

### Compiled Output

- `dist/`: Compiled JavaScript files
  - `Lexer.js`: Compiled lexical analyzer
  - `Parser.js`: Compiled parser
  - `AST.js`: Compiled AST module
  - `CodeGenerator.js`: Compiled code generator

### Web Interface

- `index.html`: Web interface for the compiler
- `index.css`: Styling for the web interface

### Configuration

- `tsconfig.json`: TypeScript compiler configuration

### Additional Resources

- `labs/`: Labs from crafting compiler book
- `Documentation/`: Project documentation and notes
  - Implementation details in Latex
  - AI assistance documentation

## License

MIT License

Copyright (c) 2025 ishejajunior
