export type DatabaseTableGroup =
  | "auth"
  | "customer"
  | "designer"
  | "request"
  | "matching"
  | "job"
  | "payment"
  | "communication"
  | "review";

export type DatabaseColumn = {
  name: string;
  type: string;
  required?: boolean;
  description: string;
};

export type DatabaseTable = {
  name: string;
  group: DatabaseTableGroup;
  purpose: string;
  usedBy: Array<"customer" | "designer" | "admin" | "ai" | "system">;
  columns: DatabaseColumn[];
};

export type DatabaseRelationship = {
  from: string;
  to: string;
  type: "one-to-one" | "one-to-many" | "many-to-one";
  description: string;
};