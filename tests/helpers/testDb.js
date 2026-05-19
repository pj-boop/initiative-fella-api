import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;

export const connectTestDb = async () => {
  mongoServer = await MongoMemoryServer.create();

  await mongoose.connect(mongoServer.getUri(), {
    dbName: "initiative-fella-test",
  });
};

export const clearTestDb = async () => {
  const collections = Object.values(mongoose.connection.collections);

  await Promise.all(
    collections.map((collection) => collection.deleteMany({}))
  );
};

export const closeTestDb = async () => {
  await mongoose.disconnect();

  if (mongoServer) {
    await mongoServer.stop();
  }
};