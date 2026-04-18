import { Sensor, Telemetry } from './models';
import dbConnect from '@/lib/mongoose';

export const typeDefs = `
  type Sensor {
    id: ID!
    type: String!
    status: String!
    addedAt: String!
  }

  type Telemetry {
    id: ID!
    type: String!
    value: Float!
    message: String!
    timestamp: String!
  }

  type Query {
    getSensors: [Sensor]
    getTelemetry: [Telemetry]
  }

  type Mutation {
    addSensor(type: String!): Sensor
    logTelemetry(type: String!, value: Float!, message: String!): Telemetry
  }
`;

export const resolvers = {
  Query: {
    getSensors: async () => {
      await dbConnect();
      return await Sensor.find({});
    },
    getTelemetry: async () => {
      await dbConnect();
      return await Telemetry.find({}).sort({ timestamp: -1 }).limit(10);
    }
  },
  Mutation: {
    addSensor: async (_: any, { type }: { type: string }) => {
      await dbConnect();
      return await Sensor.create({ type });
    },
    logTelemetry: async (_: any, { type, value, message }: { type: string, value: number, message: string }) => {
      await dbConnect();
      return await Telemetry.create({ type, value, message });
    }
  }
};
