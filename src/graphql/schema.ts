import { Sensor, Telemetry, TeamWorkerModel, WorkOrderModel, TwinProjectModel } from './models';
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

  type TeamWorker {
    id: ID!
    name: String!
    role: String!
    email: String!
  }

  type WorkOrder {
    id: ID!
    workOrderId: String!
    type: String!
    description: String!
    assignedTo: String
    assignedEmail: String
    towerId: String
    status: String!
    workerNotes: String
    resolution: String
    timeSpent: Int
    reviewed: Boolean!
    reviewResult: String
    lastReminderSentAt: String
    reminderCount: Int!
    createdAt: String!
  }

  type TwinProject {
    id: ID!
    name: String!
    thumbnailSvg: String
    isDemo: Boolean!
    componentsJson: String
    pipesJson: String
    updatedAt: String
    createdAt: String!
  }

  type Query {
    getSensors: [Sensor]
    getTelemetry: [Telemetry]
    getTeamWorkers: [TeamWorker]
    getWorkOrders: [WorkOrder]
    getWorkOrderById(workOrderId: String!): WorkOrder
    getOpenWorkOrders: [WorkOrder]
    getCompletedUnreviewedOrders: [WorkOrder]
    getTwinProjects: [TwinProject]
    getTwinProjectById(id: ID!): TwinProject
  }

  type Mutation {
    addSensor(type: String!): Sensor
    logTelemetry(type: String!, value: Float!, message: String!): Telemetry
    addTeamWorker(name: String!, role: String!, email: String!): TeamWorker
    removeTeamWorker(id: ID!): Boolean
    createWorkOrder(workOrderId: String!, type: String!, description: String!, assignedTo: String, assignedEmail: String, towerId: String): WorkOrder
    completeWorkOrder(workOrderId: String!, workerNotes: String, resolution: String, timeSpent: Int): WorkOrder
    reviewWorkOrder(workOrderId: String!, status: String!, reviewResult: String): WorkOrder
    updateReminderSent(workOrderId: String!): WorkOrder
    createTwinProject(name: String!, isDemo: Boolean): TwinProject
    saveTwinProject(id: ID!, name: String!, thumbnailSvg: String, componentsJson: String, pipesJson: String): TwinProject
    deleteTwinProject(id: ID!): Boolean
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
    },
    getTeamWorkers: async () => {
      await dbConnect();
      return await TeamWorkerModel.find({});
    },
    getWorkOrders: async () => {
      await dbConnect();
      return await WorkOrderModel.find({}).sort({ createdAt: -1 });
    },
    getWorkOrderById: async (_: any, { workOrderId }: { workOrderId: string }) => {
      await dbConnect();
      return await WorkOrderModel.findOne({ workOrderId });
    },
    getOpenWorkOrders: async () => {
      await dbConnect();
      return await WorkOrderModel.find({ status: 'open' }).sort({ createdAt: -1 });
    },
    getCompletedUnreviewedOrders: async () => {
      await dbConnect();
      return await WorkOrderModel.find({ status: 'completed', reviewed: false }).sort({ createdAt: -1 });
    },
    getTwinProjects: async () => {
      await dbConnect();
      const projects = await TwinProjectModel.find({}).sort({ createdAt: -1 });
      return projects.map((p: any) => ({
        id: p._id, name: p.name, thumbnailSvg: p.thumbnailSvg, isDemo: p.isDemo, 
        componentsJson: JSON.stringify(p.components || []), pipesJson: JSON.stringify(p.pipes || []),
        updatedAt: p.updatedAt?.toISOString(), createdAt: p.createdAt?.toISOString()
      }));
    },
    getTwinProjectById: async (_: any, { id }: { id: string }) => {
      await dbConnect();
      const p = await TwinProjectModel.findById(id);
      if (!p) return null;
      return {
        id: p._id, name: p.name, thumbnailSvg: p.thumbnailSvg, isDemo: p.isDemo, 
        componentsJson: JSON.stringify(p.components || []), pipesJson: JSON.stringify(p.pipes || []),
        updatedAt: p.updatedAt?.toISOString(), createdAt: p.createdAt?.toISOString()
      };
    },
  },
  Mutation: {
    addSensor: async (_: any, { type }: { type: string }) => {
      await dbConnect();
      return await Sensor.create({ type });
    },
    logTelemetry: async (_: any, { type, value, message }: { type: string, value: number, message: string }) => {
      await dbConnect();
      return await Telemetry.create({ type, value, message });
    },
    addTeamWorker: async (_: any, { name, role, email }: { name: string, role: string, email: string }) => {
      await dbConnect();
      return await TeamWorkerModel.create({ name, role, email });
    },
    removeTeamWorker: async (_: any, { id }: { id: string }) => {
      await dbConnect();
      const result = await TeamWorkerModel.findByIdAndDelete(id);
      return !!result;
    },
    createWorkOrder: async (_: any, args: { workOrderId: string, type: string, description: string, assignedTo?: string, assignedEmail?: string, towerId?: string }) => {
      await dbConnect();
      return await WorkOrderModel.create(args);
    },
    completeWorkOrder: async (_: any, { workOrderId, workerNotes, resolution, timeSpent }: { workOrderId: string, workerNotes?: string, resolution?: string, timeSpent?: number }) => {
      await dbConnect();
      return await WorkOrderModel.findOneAndUpdate(
        { workOrderId },
        { status: 'completed', workerNotes, resolution, timeSpent },
        { new: true }
      );
    },
    reviewWorkOrder: async (_: any, { workOrderId, status, reviewResult }: { workOrderId: string, status: string, reviewResult?: string }) => {
      await dbConnect();
      return await WorkOrderModel.findOneAndUpdate(
        { workOrderId },
        { status, reviewed: true, reviewResult },
        { new: true }
      );
    },
    updateReminderSent: async (_: any, { workOrderId }: { workOrderId: string }) => {
      await dbConnect();
      return await WorkOrderModel.findOneAndUpdate(
        { workOrderId },
        { lastReminderSentAt: new Date(), $inc: { reminderCount: 1 } },
        { new: true }
      );
    },
    createTwinProject: async (_: any, { name, isDemo }: { name: string, isDemo?: boolean }) => {
      await dbConnect();
      const p = await TwinProjectModel.create({ name, isDemo: !!isDemo, components: [], pipes: [] });
      return { id: p._id, name: p.name, isDemo: p.isDemo, createdAt: p.createdAt?.toISOString() };
    },
    saveTwinProject: async (_: any, { id, name, thumbnailSvg, componentsJson, pipesJson }: { id: string, name: string, thumbnailSvg?: string, componentsJson?: string, pipesJson?: string }) => {
      await dbConnect();
      const updateData: any = { name, updatedAt: new Date() };
      if (thumbnailSvg !== undefined) updateData.thumbnailSvg = thumbnailSvg;
      if (componentsJson) {
        try { updateData.components = JSON.parse(componentsJson); } catch (e) {}
      }
      if (pipesJson) {
        try { updateData.pipes = JSON.parse(pipesJson); } catch (e) {}
      }
      const p = await TwinProjectModel.findByIdAndUpdate(id, updateData, { new: true });
      if (!p) return null;
      return {
        id: p._id, name: p.name, thumbnailSvg: p.thumbnailSvg, isDemo: p.isDemo, 
        componentsJson: JSON.stringify(p.components || []), pipesJson: JSON.stringify(p.pipes || []),
        updatedAt: p.updatedAt?.toISOString(), createdAt: p.createdAt?.toISOString()
      };
    },
    deleteTwinProject: async (_: any, { id }: { id: string }) => {
      await dbConnect();
      const result = await TwinProjectModel.findByIdAndDelete(id);
      return !!result;
    },
  }
};
