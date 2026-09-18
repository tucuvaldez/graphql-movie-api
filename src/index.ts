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

app.use(cors());
app.use(express.json());

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB conectado');
  } catch (error) {
    console.error('❌ Error conectando MongoDB:', error);
    process.exit(1);
  }

  // Import dinámico para evitar problemas de ES modules
  const { typeDefs } = await import('./graphql/typeDefs/index.js');
  const resolvers = (await import('./graphql/resolvers/index.js')).default;

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();
  app.use('/graphql', expressMiddleware(server));

  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}/graphql`);
  });
}

startServer();