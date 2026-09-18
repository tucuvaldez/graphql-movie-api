import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/movies';

// Middleware
app.use(cors());
app.use(express.json());

// Schema GraphQL básico
const typeDefs = `
  type Query {
    hello: String
  }
`;

const resolvers = {
  Query: {
    hello: () => 'Hello, GraphQL!',
  },
};

// Iniciar servidor
async function startServer() {
  // Conectar MongoDB
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB conectado');
  } catch (error) {
    console.error('❌ Error conectando MongoDB:', error);
    process.exit(1);
  }

  // Crear Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();
  app.use('/graphql', expressMiddleware(server));

  // Servidor Express
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}/graphql`);
  });
}

startServer();