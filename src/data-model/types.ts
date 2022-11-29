
export type AttributeType = "array" | "map" |  "struct" | "string" | "int" | "long" | "bool" | "date" | "object-id" | "ref-struct";
export type TypeScriptPrimitiveTypes = "undefined" | "string" | "number" | 'boolean';

export type Err = [boolean, string];

export  interface CollectionProps {
    FolderPath     : string,
    Prefix         : string,
    PackageName    : string,
    StructName     : string,
    MorphiaPackage : string,
}
