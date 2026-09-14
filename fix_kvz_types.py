with open("src/types.ts", "r") as f: c = f.read()

types_add = """export interface PopMeasurement {
  id: string;
  fiberName: string;
  sorFilePath?: string;
  pdfGenerated?: boolean;
}

export interface KVZ {"""
c = c.replace("export interface KVZ {", types_add)
c = c.replace("name: string;", "name: string;\n  popMeasurements?: PopMeasurement[];")
with open("src/types.ts", "w") as f: f.write(c)

