with open("src/types.ts", "r") as f:
    content = f.read()

new_types = """
export interface Project {
  id: string;
  name: string;
  providerName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Ausbaugebiet {
  id: string;
  projectId: string;
  name: string;
  sharepointPath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KvzMeasurement {
  id: string;
  fiberNumber: number;
  sorFilePath?: string;
  pdfExportPath?: string;
}

export interface KVZ {
  id: string;
  ausbaugebietId: string;
  name: string;
  measurements: KvzMeasurement[];
  createdAt: string;
  updatedAt: string;
}

"""

# replace the Project interface
import re
content = re.sub(r'export interface Project \{.*?\n\}', new_types.strip(), content, flags=re.DOTALL)

# update CustomerItem to have kvzId
content = content.replace("segment?: string;", "segment?: string;\n  kvzId?: string;")

with open("src/types.ts", "w") as f:
    f.write(content)

