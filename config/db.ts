import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Safety check: ensure the URI exists
    const uri = process.env.MONGO_URI;
    if (!uri) {
        throw new Error("MONGO_URI is not defined in the .env file");
    }

    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1); 
  }
};

export default connectDB;