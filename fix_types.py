with open("src/types.ts", "r") as f:
    c = f.read()

new_types = """
export interface Ausbaugebiet {
  id: string;
  projectId: string;
  name: string;
  clusterName?: string;
  providerName?: string;
  sharepointPath?: string;
  createdAt: string;
  updatedAt: string;
  totalCustomers?: number;
  matchedCustomers?: number;
}

export interface KVZ {
  id: string;
  ausbaugebietId: string;
  name: string;
  clusterName?: string;
  providerName?: string;
  sharepointPath?: string;
  measurements?: any[];
  createdAt: string;
  updatedAt: string;
  totalCustomers?: number;
  matchedCustomers?: number;
}
"""
c = c.replace("export interface Project {", new_types + "\nexport interface Project {")
c = c.replace("segment?: string;", "segment?: string;\n  kvzId?: string;")

with open("src/types.ts", "w") as f:
    f.write(c)
